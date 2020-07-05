# Mongo Index Pruner

Easily and safely remove unused indexes from MongoDB clusters. This utility collects index stats from accross the cluster (instead of just primary nodes) and presents unused indexes to remove.

### Example Prune Session

```sh
$ mongo-index-pruner --uri 'mongodb://<mongo_uri>'
Discovered 3 mongods
 - [MONGOD] <replSet>-shard-00-00-<host>.mongodb.net:27017
 - [MONGOD] <replSet>-shard-00-01-<host>.mongodb.net:27017
 - [MONGOD] <replSet>-shard-00-02-<host>.mongodb.net:27017
Gathering index stats for Account
Gathering index stats for AccountAdmin
Gathering index stats for AccountAdminInvite
Gathering index stats for Action
Gathering index stats for ActionTarget
Index hustle.ActionTarget :: _p_organization_1:
 - 0 accesses accross 3 hosts
 - latest node time Thu Jun 25 2020 06:16:17 GMT+0000 (Coordinated Universal Time)
 - specification = {
  v: 2,
  key: { _p_organization: 1 },
  name: '_p_organization_1',
  ns: 'hustle.ActionTarget'
}

```

### Installation

With `yarn`:

```sh
$ yarn global add mongo-index-pruner
```

With `npm`:
```sh
$ npm install -g mongo-index-pruner
```

Note: in either case you will need to have the global bin directory for the package manager of your choice in your path

### Usage

```
Usage: mongo-index-pruner [options]

MongoDB URI Connection Options:
  --uri  URI to connect with (required for mongodb+srv://)              [string]

Classic Connection Options:
  --username, -u  User name to connect with                             [string]
  --password, -p  Password to connect with                              [string]
  --host, -h      Seed host to connect to        [string] [default: "localhost"]
  --port          Port to use on host                  [number] [default: 27017]
  --database, -d  Database to connect to              [string] [default: "test"]
  --ssl           Use TLS/SSL for connection          [boolean] [default: false]
  --authSource    Database to authenticate against                      [string]
  --replicaSet    Replica set name                                      [string]

Targeting Options:
  --collection, -c  Collection to target (ignore other collections)     [string]
  --ops, -o         Index must have ops <= to be prunable  [number] [default: 0]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

Examples:
  mongo-index-pruner --uri mongodb://...  find and prune unused indexes
```

### TODO
 - Fixup date output format
 - Support looking up replicaSet and authSource from TXT records

