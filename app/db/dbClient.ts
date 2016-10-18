import mongodb = require('mongodb');
var Db = mongodb.Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = mongodb.ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').Bson,
    assert = require('assert');
import { Config } from '../../config/config';

export module DbController {
    // Connection URL
    //    export var spartanChatDb_URL = 'mongodb://localhost:27017/spartanchatDB';
    export const spartanChatDb_URL = Config.chatDB;
    export const user_DB = Config.userDB;
    //    export var spartanChatDb_URL = 'mongodb://animation-genius.com:27017/reasearchChatDB';
    export const roomColl: string = "rooms";
    export const messageColl: string = "messages";
    export const userColl: string = "users";
    export const companyColl: string = "company";

    export class DbClient {
        private static _Instance: DbClient;
        public static GetInstance(): DbClient {
            if (!DbClient._Instance) {
                console.info("Instancetiate dbclient");
                DbClient._Instance = new DbClient();
            }
            return DbClient._Instance;
        }

        private targetTable: string;

        constructor() {
            if (DbClient._Instance) {
                throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            DbClient._Instance = this;
        }

        InsertTables(target: string, schema) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                DbClient.prototype.findDocuments(db, target, schema, function () {
                    // Insert a single document
                    //db.collection(target).insertOne(schema, function (err, r) {
                    //    assert.equal(null, err);
                    //    console.log(r.result);

                    //    db.close();
                    //});
                });
            });
        }

        ///* require table, callback, document.
        public InsertDocument(table: string, callback: (err, docs) => void, doc) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(table);

                collection.insertOne(doc, { w: 1 }, function (err, result) {
                    assert.equal(null, err);
                    //                    console.log("Found the following records", result.result);

                    callback(err, result.ops);
                    db.close();
                });
            });
        }
        private insertDocuments = function (db, callback) {
            // Get the documents collection
            var collection = db.collection('documents');
            // Insert some documents
            collection.insert([
                { a: 1 }, { a: 2 }, { a: 3 }
            ], function (err, result) {
                assert.equal(err, null);
                assert.equal(3, result.result.n);
                assert.equal(3, result.ops.length);
                console.log("Inserted 3 documents into the document collection");
                callback(result);
            });
        }

        public UpdateDocuments(table: string, callback, criteria?, updateAction?, options?) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(table);
                // Find some documents
                collection.update(criteria, updateAction, function (err, result) {
                    assert.equal(null, err);
                    //                    console.log("Found the following records", result.result);

                    callback(result);
                    db.close();
                });
            });
        }
        public UpdateDocument(table: string, callback: (res) => void, criteria?, updateAction?, options?) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(table);
                // Find some documents
                collection.updateOne(criteria, updateAction, function (err, result) {
                    assert.equal(null, err);

                    callback(result);
                    db.close();
                });
            });
        }

        removeDocument = function (db, callback) {
            // Get the documents collection
            var collection = db.collection('documents');
            // Insert some documents
            collection.remove({ a: 3 }, function (err, result) {
                assert.equal(err, null);
                assert.equal(1, result.result.n);
                console.log("Removed the document with the field a equal to 3");
                callback(result);
            });
        }

        public FindDocuments(table: string, callback: (res: any) => void);
        public FindDocuments(table: string, callback: (res: any) => void, query);
        public FindDocuments(table: string, callback: (res: any) => void, query, projection);
        public FindDocuments(table: string, callback: (res: any) => void, query?: Object, projection?: Object) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(table);
                // Find some documents
                if (!query && !projection) {
                    collection.find().toArray(function (err, docs) {
                        assert.equal(null, err);
                        // console.log("1 Found the following records", docs);

                        callback(docs);
                        db.close();
                    });
                }
                else if (!query) {
                    collection.find({}, projection).toArray(function (err, docs) {
                        assert.equal(null, err);
                        // console.log("2 Found the following records", docs);

                        callback(docs);
                        db.close();
                    });
                }
                else if (!projection) {
                    collection.find(query).toArray(function (err, docs) {
                        assert.equal(null, err);
                        // console.log("3 Found the following records", docs);

                        callback(docs);
                        db.close();
                    });
                }
                else {
                    collection.find(query, projection).toArray(function (err, docs) {
                        assert.equal(null, err);
                        // console.log("4 Found the following records", docs);

                        callback(docs);
                        db.close();
                    });
                }
            });
        }

        public FindDocument(table: string, callback: (res: any) => void);
        public FindDocument(table: string, callback: (res: any) => void, query);
        public FindDocument(table: string, callback: (res: any) => void, query, projection);
        public FindDocument(table: string, callback: (res: any) => void, query?: any, projection?: any) {
            // Use connect method to connect to the Server
            MongoClient.connect(spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                let collection = db.collection(table);

                if (query === undefined || query === null) {
                    collection.findOne(function (err, doc) {
                        assert.equal(null, err);
                        //                    console.log("Found the following records", doc);
                        callback(doc);
                        db.close();
                    });
                }
                else if (projection === undefined || projection === null) {
                    collection.findOne(query, function (err, doc) {
                        assert.equal(null, err);
                        //                    console.log("Found the following records", doc);
                        callback(doc);
                        db.close();
                    });
                }
                else {
                    collection.findOne(query, projection, function (err, doc) {
                        assert.equal(null, err);
                        //                    console.log("Found the following records", doc);
                        callback(doc);
                        db.close();
                    });
                }
            });
        }

        private findDocuments(db, target: string, schema: any, callback) {
            // Get the documents collection
            var collection = db.collection(target);
            // Find some documents
            collection.find(schema, (function (err, docs) {
                console.error(err);
                console.log("Found the following records", docs);

                callback(docs);
            }));
        }

        public GirdInsert() {

            // Connect to the db
            //MongoClient.connect(spartanChatFile, function (err, db) {
            //    if (err) return console.dir(err);

            //    var grid = new Grid(db, 'fs');
            //    var buffer = new Buffer("Hello world");
            //    grid.put(buffer, { metadata: { category: 'text' }, content_type: 'text' }, function (err, fileInfo) {
            //        if (!err) {
            //            console.log("Finished writing file to Mongo");
            //        }
            //    });
            //});
        }
    }
};