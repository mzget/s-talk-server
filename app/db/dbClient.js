"use strict";
var mongodb = require("mongodb");
var Db = mongodb.Db, MongoClient = require('mongodb').MongoClient, Server = require('mongodb').Server, ReplSetServers = require('mongodb').ReplSetServers, ObjectID = mongodb.ObjectID, Binary = require('mongodb').Binary, GridStore = require('mongodb').GridStore, Grid = require('mongodb').Grid, Code = require('mongodb').Code, BSON = require('mongodb').Bson, assert = require('assert');
var webConfig = require('../../config/webConfig.json');
var DbController;
(function (DbController) {
    // Connection URL
    //    export var spartanChatDb_URL = 'mongodb://localhost:27017/spartanchatDB';
    DbController.spartanChatDb_URL = webConfig.chatDB;
    //    export var spartanChatDb_URL = 'mongodb://animation-genius.com:27017/reasearchChatDB';
    DbController.roomColl = "rooms";
    DbController.messageColl = "messages";
    DbController.userColl = "users";
    DbController.companyColl = "company";
    var DbClient = (function () {
        function DbClient() {
            this.insertDocuments = function (db, callback) {
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
            };
            this.removeDocument = function (db, callback) {
                // Get the documents collection
                var collection = db.collection('documents');
                // Insert some documents
                collection.remove({ a: 3 }, function (err, result) {
                    assert.equal(err, null);
                    assert.equal(1, result.result.n);
                    console.log("Removed the document with the field a equal to 3");
                    callback(result);
                });
            };
            if (DbClient._Instance) {
                throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            DbClient._Instance = this;
        }
        DbClient.GetInstance = function () {
            if (!DbClient._Instance) {
                console.info("Instancetiate dbclient");
                DbClient._Instance = new DbClient();
            }
            return DbClient._Instance;
        };
        DbClient.prototype.InsertTables = function (target, schema) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
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
        };
        ///* require table, callback, document.
        DbClient.prototype.InsertDocument = function (table, callback, doc) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
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
        };
        DbClient.prototype.UpdateDocuments = function (table, callback, criteria, updateAction, options) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
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
        };
        DbClient.prototype.UpdateDocument = function (table, callback, criteria, updateAction, options) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
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
        };
        DbClient.prototype.FindDocuments = function (table, callback, query, projection) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
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
        };
        DbClient.prototype.FindDocument = function (table, callback, query, projection) {
            // Use connect method to connect to the Server
            MongoClient.connect(DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(table);
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
        };
        DbClient.prototype.findDocuments = function (db, target, schema, callback) {
            // Get the documents collection
            var collection = db.collection(target);
            // Find some documents
            collection.find(schema, (function (err, docs) {
                console.error(err);
                console.log("Found the following records", docs);
                callback(docs);
            }));
        };
        DbClient.prototype.GirdInsert = function () {
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
        };
        return DbClient;
    }());
    DbController.DbClient = DbClient;
})(DbController = exports.DbController || (exports.DbController = {}));
;
