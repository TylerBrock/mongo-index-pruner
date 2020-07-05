import url from 'url';
import assert from 'assert';
import yargs from 'yargs';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { MongoClient } from 'mongodb';
import mongoUriBuilder from 'mongo-uri-builder';

import type {
  Db,
  Collection,
  MongoClientOptions,
} from 'mongodb';

const MONGODB_OPTIONS: MongoClientOptions  = {
  useUnifiedTopology: true,
  connectTimeoutMS: 3000,
};

// @types/mongo doesn't have a topology attribute on MongoClient
interface MyMongoClient extends MongoClient {
  topology: MongoHost;
}

interface MongoHost {
  readonly host: string;
  readonly port: number;
}

interface MongoArguments {
  readonly uri?: string;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly database: string;
  readonly ssl?: boolean;
  readonly authSource?: string;
  readonly replicaSet?: string;
  readonly collection?: string;
  readonly prune?: boolean;
};

interface AccessStat {
  readonly ops: number,
  readonly since: Date,
  readonly hosts: Array<string>,
}

interface IndexStat {
  readonly name: string,
  readonly key: object,
  readonly host: string,
  readonly accesses: AccessStat,
}

interface IndexSpec {
  readonly v: number,
  readonly key: Record<string, number>,
  readonly name: string,
  readonly ns: string,
  readonly background?: boolean,
  readonly unique?: boolean,
  readonly partialFilterExpression?: object,
}

class AggregateIndexStat {
  stats: Array<IndexStat>

  constructor(stats: Array<IndexStat> = []) {
    this.stats = stats;
  }

  addStat(stat: IndexStat): void {
    this.stats.push(stat);
  }

  get accesses(): AccessStat {
    let ops = 0;
    let hosts = [];
    let since = new Date(0);

    for (const stat of this.stats) {
      hosts.push(stat.host);
      const accesses = stat.accesses;
      ops += accesses.ops;

      // set since to the most recent since
      if (accesses.since > since) {
        since = accesses.since;
      }
    }
    return { ops, since, hosts };
  }
}

type IndexMap = Record<string, AggregateIndexStat>
type PromptResult = Record<string, boolean>

function stringToMongoHost(str: string): MongoHost {
  const parts = str.split(':');
  return { host: parts[0], port: parseInt(parts[1], 10) };
}

function makeUri(mongoHost: MongoHost, args: MongoArguments): string {
  // Lets make a uri for this host specifically
  const { host, port } = mongoHost;

  // User may have provided these as individual args, just unpack them
  let { username, password, database, ssl, authSource, replicaSet } = args;

  // User provided URI, decompose the parts then reconstruct with provided host
  if (args.uri) {
    const parsedUri = url.parse(args.uri, true);
    const { protocol, auth, pathname } = parsedUri;

    if (auth) {
      [username, password] = auth.split(':');
    }

    if (pathname) {
      // pathname includes leading '/' so we must remove it
      database = pathname.substr(1);
    }

    const params = parsedUri.query;
    const isSRV = protocol?.startsWith('mongodb+srv');

    if (params.ssl || params.tls || isSRV) {
      ssl = true;
    }

    if (typeof(params.authSource) === 'string') {
      authSource = params.authSource;
    }

    if (typeof(params.replicaSet) === 'string') {
      replicaSet = params.replicaSet;
    }
  }

  return mongoUriBuilder({
    username,
    password,
    database,
    host,
    port,
    options: { ssl, authSource, replicaSet }
  });
}

function printSummary(indexMap: IndexMap) {
  for (const index in indexMap) {
    if (indexMap[index].accesses.ops === 0) {
      console.log(index, indexMap[index].accesses);
    }
  }
}

async function ask(
  indexName: string,
  spec: IndexSpec,
  stats: AggregateIndexStat
): Promise<boolean> {
  const { since, ops, hosts } = stats.accesses;
  const numHosts = hosts.length;
  console.log(chalk`Index {inverse ${spec.ns} :: ${indexName}}:`);
  console.log(chalk` - {blue ${ops}} accesses accross {blue ${numHosts}} hosts`);
  console.log(chalk` - latest node time {blue ${since}}`);
  console.log(' - specification =', spec);

  const result: PromptResult = await inquirer.prompt({
    type: 'confirm',
    name: indexName,
    message: `Do you want to remove ${indexName}?`,
    default: false
  });

  return result[indexName];
}

async function pruneIndexes(
  clients: Array<MongoClient>,
  collection: Collection,
  indexMap: IndexMap
) {
  //console.log(`Pruning indexes in ${collection.collectionName}...`);
  const indexInfo: Array<IndexSpec> = await collection.indexes();

  for (const indexName in indexMap) {
    const stat = indexMap[indexName];
    const spec = indexInfo.find(i => i.name === indexName);

    assert(spec); // spec for index with this name must exist

    if (stat.accesses.ops === 0) {
      const shouldRemove = await ask(indexName, spec, stat);
      if (shouldRemove) {
        console.log(chalk`{red *** Removing ${indexName} ***}`);
        await collection.dropIndex(indexName);
      }
    }
  }
}

// Returns an array of MongoHost pairs representing all mongod hosts in cluster
async function getHosts(client: MongoClient): Promise<Array<MongoHost>> {
  const db = client.db();
  const admin = db.admin();
  const isMaster = await admin.command({ isMaster: true });

  let hostStrs = [];

  if (isMaster.msg === "isdbgrid") {
    // We are connected to a mongos
    const shardList = await admin.command({ listShards: true });

    shardList.shards.forEach((shard: any) => {
      const [replSetName, hosts] = shard.host.split('/');
      const hostList = hosts.split(',');
      hostStrs.push(...hostList);
    });
  } else {
    hostStrs = isMaster.hosts;
  }

  return hostStrs.map(stringToMongoHost);
}

async function fetchIndexStats(collection: Collection): Promise<Array<IndexStat>> {
  const stats = await collection.aggregate([
    { $indexStats: {} }
  ]).toArray();
  return stats;
}

async function fetchCollStats(
  clients: Array<MyMongoClient>,
  collection: Collection
): Promise<IndexMap> {
  const indexMap: Record<string, AggregateIndexStat> = {};
  for (const client of clients) {
    const db = client.db();
    const stats = await fetchIndexStats(collection);
    for (const stat of stats) {
      const indexName = stat.name;
      if (!(indexName in indexMap)) {
        indexMap[indexName] = new AggregateIndexStat();
      }
      const map = indexMap[indexName];
      map.addStat(stat);
    }
  }
  return indexMap;
}

async function getCollectionNames(client: MongoClient): Promise<Array<string>> {
  const db = client.db();
  const collectionQuery = db.listCollections({
    name: { $not: { $regex: /^(_|fs|system).*$/ } },
  });
  const collections = await collectionQuery.toArray();
  return collections.map(c => c.name);
}

function parse(): MongoArguments {
  const args = yargs
    .usage('Usage: $0 [options]')
    .example('$0 --uri mongodb://...', 'find and prune unused indexes')
    .group(['uri'], 'MongoDB URI Connection Options:')
    .option('uri', {
      type: 'string',
      description: 'URI to connect with (required for mongodb+srv://)',
    })
    .group([
      'username',
      'password',
      'host',
      'port',
      'database',
      'ssl',
      'authSource',
      'replicaSet'
    ], 'Classic Connection Options:')
    .option('username', {
      alias: 'u',
      type: 'string',
      description: 'User name to connect with'
    })
    .option('password', {
      alias: 'p',
      type: 'string',
      description: 'Password to connect with'
    })
    .option('host', {
      alias: 'h',
      type: 'string',
      description: 'Seed host to connect to',
      default: 'localhost'
    })
    .option('port', {
      type: 'number',
      description: 'Port to use on host',
      default: 27017
    })
    .option('database', {
      alias: 'd',
      type: 'string',
      description: 'Database to connect to',
      default: 'test'
    })
    .option('ssl', {
      type: 'boolean',
      description: 'Use TLS/SSL for connection',
      default: false
    })
    .option('authSource', {
      type: 'string',
      description: 'Database to authenticate against',
    })
    .option('replicaSet', {
      type: 'string',
      description: 'Replica set name',
    })
    .group(['collection', 'ops'], 'Targeting Options:')
    .option('collection', {
      alias: 'c',
      type: 'string',
      description: 'Collection to target (ignore other collections)',
    })
    .option('ops', {
      alias: 'o',
      type: 'number',
      description: 'Index must have ops <= to be prunable',
      default: 0,
    })
    .argv;

    if (!args.authSource) {
      args.authSource = args.database;
    }

    return args;
}

async function prune() {
  const args = parse();
  const uri = args.uri || mongoUriBuilder({ ...args });

  const seedClient = await MongoClient.connect(uri, MONGODB_OPTIONS);
  const hosts = await getHosts(seedClient);

  console.log(chalk`Discovered {bold ${hosts.length}} mongods`);
  for (const host of hosts) {
    console.log(chalk` - {green [MONGOD]} ${host.host}:${host.port}`);
  }

  const collectionNames = args.collection
    ? [args.collection]
    : await getCollectionNames(seedClient);

  const uris = hosts.map(host => makeUri(host, args));
  const clients = await Promise.all(uris.map(async (uri) => {
    return await MongoClient.connect(uri, MONGODB_OPTIONS) as MyMongoClient;
  }));

  for (const collectionName of collectionNames) {
    console.log(chalk`Gathering index stats for {bold ${collectionName}}`)
    const collection = seedClient.db().collection(collectionName);
    const indexMap = await fetchCollStats(clients, collection);
    await pruneIndexes(clients, collection, indexMap);
  }

  for (const client of clients) {
    await client.close();
  }

  await seedClient.close();
}

export default prune;
