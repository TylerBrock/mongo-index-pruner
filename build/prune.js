"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = __importDefault(require("assert"));
var yargs_1 = __importDefault(require("yargs"));
var chalk_1 = __importDefault(require("chalk"));
var inquirer_1 = __importDefault(require("inquirer"));
var mongodb_1 = require("mongodb");
var mongo_uri_builder_1 = __importDefault(require("mongo-uri-builder"));
var MONGODB_OPTIONS = { useUnifiedTopology: true };
;
var AggregateIndexStat = /** @class */ (function () {
    function AggregateIndexStat(stats) {
        if (stats === void 0) { stats = []; }
        this.stats = stats;
    }
    AggregateIndexStat.prototype.addStat = function (stat) {
        this.stats.push(stat);
    };
    Object.defineProperty(AggregateIndexStat.prototype, "accesses", {
        get: function () {
            var ops = 0;
            var hosts = [];
            var since = new Date(0);
            for (var _i = 0, _a = this.stats; _i < _a.length; _i++) {
                var stat = _a[_i];
                hosts.push(stat.host);
                var accesses = stat.accesses;
                ops += accesses.ops;
                // set since to the most recent since
                if (accesses.since > since) {
                    since = accesses.since;
                }
            }
            return { ops: ops, since: since, hosts: hosts };
        },
        enumerable: false,
        configurable: true
    });
    return AggregateIndexStat;
}());
function stringToMongoHost(str) {
    var parts = str.split(':');
    return { host: parts[0], port: parseInt(parts[1], 10) };
}
function makeUri(mongoHost, args) {
    var host = mongoHost.host, port = mongoHost.port;
    var username = args.username, password = args.password, database = args.database;
    return mongo_uri_builder_1.default({
        username: username,
        password: password,
        database: database,
        host: host,
        port: port
    });
}
function printSummary(indexMap) {
    for (var index in indexMap) {
        if (indexMap[index].accesses.ops === 0) {
            console.log(index, indexMap[index].accesses);
        }
    }
}
function ask(indexName, spec, stats) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, since, ops, hosts, numHosts, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = stats.accesses, since = _a.since, ops = _a.ops, hosts = _a.hosts;
                    numHosts = hosts.length;
                    console.log(chalk_1.default(templateObject_1 || (templateObject_1 = __makeTemplateObject(["Index {inverse ", " :: ", "}:"], ["Index {inverse ", " :: ", "}:"])), spec.ns, indexName));
                    console.log(chalk_1.default(templateObject_2 || (templateObject_2 = __makeTemplateObject([" - {blue ", "} accesses accross {blue ", "} hosts"], [" - {blue ", "} accesses accross {blue ", "} hosts"])), ops, numHosts));
                    console.log(chalk_1.default(templateObject_3 || (templateObject_3 = __makeTemplateObject([" - latest node time {blue ", "}"], [" - latest node time {blue ", "}"])), since));
                    console.log(' - specification =', spec);
                    return [4 /*yield*/, inquirer_1.default.prompt({
                            type: 'confirm',
                            name: indexName,
                            message: "Do you want to remove " + indexName + "?",
                            default: false
                        })];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, result[indexName]];
            }
        });
    });
}
function pruneIndexes(clients, collection, indexMap) {
    return __awaiter(this, void 0, void 0, function () {
        var indexInfo, _loop_1, _a, _b, _i, indexName;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, collection.indexes()];
                case 1:
                    indexInfo = _c.sent();
                    _loop_1 = function (indexName) {
                        var stat, spec, shouldRemove;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    stat = indexMap[indexName];
                                    spec = indexInfo.find(function (i) { return i.name === indexName; });
                                    assert_1.default(spec); // spec for index with this name must exist
                                    if (!(stat.accesses.ops === 0)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, ask(indexName, spec, stat)];
                                case 1:
                                    shouldRemove = _a.sent();
                                    if (!shouldRemove) return [3 /*break*/, 3];
                                    console.log(chalk_1.default(templateObject_4 || (templateObject_4 = __makeTemplateObject(["{red *** Removing ", " ***}"], ["{red *** Removing ", " ***}"])), indexName));
                                    return [4 /*yield*/, collection.dropIndex(indexName)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _a = [];
                    for (_b in indexMap)
                        _a.push(_b);
                    _i = 0;
                    _c.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    indexName = _a[_i];
                    return [5 /*yield**/, _loop_1(indexName)];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Returns an array of MongoHost pairs representing all mongod hosts in cluster
function getHosts(client) {
    return __awaiter(this, void 0, void 0, function () {
        var db, admin, isMaster, hosts, shardList;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = client.db();
                    admin = db.admin();
                    return [4 /*yield*/, admin.command({ isMaster: true })];
                case 1:
                    isMaster = _a.sent();
                    hosts = isMaster.hosts;
                    if (!(isMaster.msg === "isdbgrid")) return [3 /*break*/, 3];
                    return [4 /*yield*/, admin.command({ listShards: true })];
                case 2:
                    shardList = _a.sent();
                    hosts = shardList.shards.map(function (shard) {
                        return shard.host.split('/').pop().split(',');
                    });
                    _a.label = 3;
                case 3: return [2 /*return*/, hosts.map(stringToMongoHost)];
            }
        });
    });
}
function fetchIndexStats(collection) {
    return __awaiter(this, void 0, void 0, function () {
        var stats;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, collection.aggregate([
                        { $indexStats: {} }
                    ]).toArray()];
                case 1:
                    stats = _a.sent();
                    return [2 /*return*/, stats];
            }
        });
    });
}
function fetchCollStats(clients, collection) {
    return __awaiter(this, void 0, void 0, function () {
        var indexMap, _i, clients_1, client, db, stats, _a, stats_1, stat, indexName, map;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    indexMap = {};
                    _i = 0, clients_1 = clients;
                    _b.label = 1;
                case 1:
                    if (!(_i < clients_1.length)) return [3 /*break*/, 4];
                    client = clients_1[_i];
                    db = client.db();
                    return [4 /*yield*/, fetchIndexStats(collection)];
                case 2:
                    stats = _b.sent();
                    for (_a = 0, stats_1 = stats; _a < stats_1.length; _a++) {
                        stat = stats_1[_a];
                        indexName = stat.name;
                        if (!(indexName in indexMap)) {
                            indexMap[indexName] = new AggregateIndexStat();
                        }
                        map = indexMap[indexName];
                        map.addStat(stat);
                    }
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, indexMap];
            }
        });
    });
}
function getCollectionNames(client) {
    return __awaiter(this, void 0, void 0, function () {
        var db, collectionQuery, collections;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = client.db();
                    collectionQuery = db.listCollections({
                        name: { $ne: { $regex: /^(_|fs|system).*$/ } },
                    });
                    return [4 /*yield*/, collectionQuery.toArray()];
                case 1:
                    collections = _a.sent();
                    return [2 /*return*/, collections.map(function (c) { return c.name; })];
            }
        });
    });
}
function parse() {
    var args = yargs_1.default
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
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, uri, seedClient, hosts, _i, hosts_1, host, collectionNames, _a, uris, clients, _b, collectionNames_1, collectionName, collection, indexMap, _c, clients_2, client;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    args = parse();
                    uri = mongo_uri_builder_1.default(__assign({}, args));
                    return [4 /*yield*/, mongodb_1.MongoClient.connect(uri, MONGODB_OPTIONS)];
                case 1:
                    seedClient = _d.sent();
                    return [4 /*yield*/, getHosts(seedClient)];
                case 2:
                    hosts = _d.sent();
                    console.log(chalk_1.default(templateObject_5 || (templateObject_5 = __makeTemplateObject(["Discovered {bold ", "} mongods"], ["Discovered {bold ", "} mongods"])), hosts.length));
                    for (_i = 0, hosts_1 = hosts; _i < hosts_1.length; _i++) {
                        host = hosts_1[_i];
                        console.log(chalk_1.default(templateObject_6 || (templateObject_6 = __makeTemplateObject([" - {green [MONGOD]} ", ":", ""], [" - {green [MONGOD]} ", ":", ""])), host.host, host.port));
                    }
                    if (!args.collection) return [3 /*break*/, 3];
                    _a = [args.collection];
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, getCollectionNames(seedClient)];
                case 4:
                    _a = _d.sent();
                    _d.label = 5;
                case 5:
                    collectionNames = _a;
                    uris = hosts.map(function (host) { return makeUri(host, args); });
                    return [4 /*yield*/, Promise.all(uris.map(function (uri) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, mongodb_1.MongoClient.connect(uri, MONGODB_OPTIONS)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); }))];
                case 6:
                    clients = _d.sent();
                    _b = 0, collectionNames_1 = collectionNames;
                    _d.label = 7;
                case 7:
                    if (!(_b < collectionNames_1.length)) return [3 /*break*/, 11];
                    collectionName = collectionNames_1[_b];
                    console.log(chalk_1.default(templateObject_7 || (templateObject_7 = __makeTemplateObject(["Gathering index stats for {bold ", "}"], ["Gathering index stats for {bold ", "}"])), collectionName));
                    collection = seedClient.db().collection(collectionName);
                    return [4 /*yield*/, fetchCollStats(clients, collection)];
                case 8:
                    indexMap = _d.sent();
                    return [4 /*yield*/, pruneIndexes(clients, collection, indexMap)];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10:
                    _b++;
                    return [3 /*break*/, 7];
                case 11:
                    _c = 0, clients_2 = clients;
                    _d.label = 12;
                case 12:
                    if (!(_c < clients_2.length)) return [3 /*break*/, 15];
                    client = clients_2[_c];
                    return [4 /*yield*/, client.close()];
                case 13:
                    _d.sent();
                    _d.label = 14;
                case 14:
                    _c++;
                    return [3 /*break*/, 12];
                case 15: return [4 /*yield*/, seedClient.close()];
                case 16:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main();
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7;
