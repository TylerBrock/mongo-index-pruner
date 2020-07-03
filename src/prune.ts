import assert from 'assert';
import yargs from 'yargs';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { MongoClient } from 'mongodb';
import mongoUriBuilder from 'mongo-uri-builder';

import type {
  Db,
  Collection
} from 'mongodb';

const MONGODB_OPTIONS = { useUnifiedTopology: true };

// @types/mongo doesn't have a topology attribute on MongoClient
interface MyMongoClient extends MongoClient {
  topology: MongoHost;
}

interface MongoHost {
  readonly host: string;
  readonly port: number;
}

interface MongoArguments {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly database: string;
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
  const { host, port } = mongoHost;
  const { username, password, database } = args;
  return mongoUriBuilder({
    username,
    password,
    database,
    host,
    port
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

  let hosts = isMaster.hosts;

  if (isMaster.msg === "isdbgrid") {
    // We are connected to a mongos
    const shardList = await admin.command({ listShards: true });

    hosts = shardList.shards.map((shard: any) => {
      return shard.host.split('/').pop().split(',');
    });
  }

  return hosts.map(stringToMongoHost);
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
    name: { $ne: { $regex: /^(_|fs|system).*$/ } },
  });
  const collections = await collectionQuery.toArray();
  return collections.map(c => c.name);
}

function parse(): MongoArguments {
  const args = yargs
    .usage('Usage: $0 [options]')
    .example('$0 -u <user> -p <pass> -h <host>', 'find unused indexes')
    .example('$0 prune -u <user> -p <pass> -h <host>', 'remove unused indexes')
    .option('username', {
      alias: 'u',
      type: 'string',
      description: 'user name to connect with'
    })
    .option('password', {
      alias: 'p',
      type: 'string',
      description: 'password to connect with'
    })
    .option('host', {
      alias: 'h',
      type: 'string',
      description: 'seed host to connect to',
      default: 'localhost'
    })
    .option('port', {
      type: 'number',
      description: 'port to use on host',
      default: 27017
    })
    .option('database', {
      alias: 'd',
      type: 'string',
      description: 'database to connect to',
      default: 'test'
    })
    .option('collection', {
      alias: 'c',
      type: 'string',
      description: 'collection to target',
    })
    .argv;

    return args;
}

async function main() {
  const args = parse();
  const uri = mongoUriBuilder({ ...args });

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

main();
