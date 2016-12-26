"use strict";
var mongodb = require("mongodb");
var async = require("async");
var MDb = require("../db/dbClient");
var Room = require("../model/Room");
var UserManager_1 = require("./UserManager");
var ObjectID = mongodb.ObjectID;
var dbClient = MDb.DbController.DbClient.GetInstance();
var Db = mongodb.Db, MongoClient = mongodb.MongoClient, Server = require('mongodb').Server, ReplSetServers = require('mongodb').ReplSetServers, Binary = require('mongodb').Binary, GridStore = require('mongodb').GridStore, Grid = require('mongodb').Grid, Code = require('mongodb').Code, BSON = require('mongodb').Bson, assert = require('assert');
var Controller;
(function (Controller) {
    var ChatRoomManager = (function () {
        function ChatRoomManager() {
            this.userManager = UserManager_1.UserManager.getInstance();
            this.roomDAL = new RoomDataAccess();
            if (ChatRoomManager._Instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            ChatRoomManager._Instance = this;
        }
        ChatRoomManager.getInstance = function () {
            if (!ChatRoomManager._Instance) {
                ChatRoomManager._Instance = new ChatRoomManager();
            }
            return ChatRoomManager._Instance;
        };
        ChatRoomManager.prototype.GetChatRoomInfo = function (query, projections, callback) {
            dbClient.FindDocument(MDb.DbController.roomColl, callback, query, projections);
        };
        ChatRoomManager.prototype.getProjectBaseGroups = function (userId, callback) {
            this.roomDAL.findProjectBaseGroups(userId, callback);
        };
        ChatRoomManager.prototype.getPrivateGroupChat = function (uid, callback) {
            this.roomDAL.findPrivateGroupChat(uid, callback);
        };
        ChatRoomManager.prototype.createPrivateChatRoom = function (doc, callback) {
            var self = this;
            var members = new Array();
            var _tempArr = doc.members;
            for (var i in _tempArr) {
                var user = new Room.Member();
                user.id = _tempArr[i];
                members.push(user);
            }
            var _room = new Room.Room();
            _room._id = doc._id;
            _room.type = Room.RoomType.privateChat;
            _room.members = members;
            _room.createTime = new Date();
            dbClient.InsertDocument(MDb.DbController.roomColl, function (err, res) {
                if (err) {
                    console.error("CreatePrivateRoom fail.", err);
                }
                else {
                    callback(null, res[0]);
                }
            }, { _id: new ObjectID(_room._id), type: _room.type, members: _room.members, createTime: _room.createTime });
        };
        ChatRoomManager.prototype.createPrivateGroup = function (groupName, memberIds, callback) {
            this.roomDAL.createPrivateGroup(groupName, memberIds, callback);
        };
        ChatRoomManager.prototype.updateGroupImage = function (roomId, newUrl, callback) {
            this.roomDAL.userUpdateGroupImage(roomId, newUrl, callback);
        };
        ChatRoomManager.prototype.editGroupMembers = function (editType, roomId, members, callback) {
            if (editType === "add") {
                this.roomDAL.addGroupMembers(roomId, members, callback);
            }
            else if (editType == "remove") {
                this.roomDAL.removeGroupMembers(roomId, members, callback);
            }
        };
        ChatRoomManager.prototype.editGroupName = function (roomId, newGroupName, callback) {
            this.roomDAL.editGroupName(roomId, newGroupName, callback);
        };
        ChatRoomManager.prototype.AddChatRecord = function (object, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                // Get the collection
                var col = db.collection(MDb.DbController.messageColl);
                col.insertOne(object, { w: 1 }).then(function (r) {
                    callback(null, r.ops);
                    db.close();
                }).catch(function (err) {
                    callback(err, null);
                    db.close();
                });
            });
        };
        ChatRoomManager.prototype.createProjectBaseGroup = function (groupName, members, callback) {
            this.roomDAL.createProjectBaseGroup(groupName, members, callback);
        };
        ChatRoomManager.prototype.editMemberInfoInProjectBase = function (roomId, member, callback) {
            this.roomDAL.editMemberInfoInProjectBase(roomId, member, callback);
        };
        /*
        * Require
        *@roomId for query chat record in room.
        *@lastAccessTime for query only message who newer than lastAccessTime.
        */
        ChatRoomManager.prototype.getNewerMessageOfChatRoom = function (roomId, isoDate, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL).then(function (db) {
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Create an index on the a field
                collection.createIndex({ rid: 1, createTime: 1 }, { background: true, w: 1 }).then(function (indexName) {
                    // Find some documents
                    collection.find({ rid: roomId, createTime: { $gt: new Date(isoDate.toISOString()) } })
                        .limit(100).sort({ createTime: 1 }).toArray(function (err, docs) {
                        if (err) {
                            callback(new Error(err.message), docs);
                        }
                        else {
                            callback(null, docs);
                        }
                        db.close();
                    });
                }).catch(function (err) {
                    db.close();
                    console.error("Create index fail.", err);
                });
            }).catch(function (err) {
                console.error("Cannot connect database", err);
            });
        };
        ChatRoomManager.prototype.getOlderMessageChunkOfRid = function (rid, topEdgeMessageTime, callback) {
            var utc = new Date(topEdgeMessageTime);
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ rid: rid, createTime: { $lt: new Date(utc.toISOString()) } }).limit(100).sort({ createTime: -1 }).toArray(function (err, docs) {
                    assert.equal(null, err);
                    if (err) {
                        callback(new Error(err.message), docs);
                    }
                    else {
                        callback(null, docs);
                    }
                    db.close();
                });
            });
        };
        ChatRoomManager.prototype.updateChatRecordContent = function (messageId, content, callback) {
            dbClient.UpdateDocument(MDb.DbController.messageColl, function (res) {
                callback(null, res);
            }, { _id: new ObjectID(messageId) }, { $set: { body: content } });
        };
        ChatRoomManager.prototype.updateWhoReadMessage = function (messageId, uid, callback) {
            this.roomDAL.updateWhoReadMessage(messageId, uid, callback);
        };
        /*
        * Get last limit query messages of specific user and room then return messages info.
        */
        ChatRoomManager.prototype.getMessagesReaders = function (userId, roomId, topEdgeMessageTime, callback) {
            var utc = new Date(topEdgeMessageTime);
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.error(err);
                }
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Create an index on the a field
                collection.createIndex({ rid: 1, sender: 1, createTime: 1 }, { background: true, w: 1 }, function (err, indexName) {
                    if (err) {
                        db.close();
                        return console.error("Create index fail.", err);
                    }
                    // Find some documents
                    collection.find({ rid: roomId, sender: userId, createTime: { $gt: new Date(utc.toISOString()) } })
                        .project({ readers: 1 }).sort({ createTime: -1 }).toArray(function (err, docs) {
                        if (!docs || err) {
                            callback(new Error("getMessagesInfoOfUserXInRoomY is no response."), err);
                        }
                        else {
                            console.log("getMessagesReaders found the following records", docs.length);
                            callback(null, docs);
                        }
                        db.close();
                    });
                });
            });
        };
        /**
         * Require: message_id.
         * **************************
         * Return: sender of target message.
         * Return: reader fields of target messageId.
         */
        ChatRoomManager.prototype.getWhoReadMessage = function (messageId, callback) {
            this.roomDAL.getWhoReadMessage(messageId, callback);
        };
        ChatRoomManager.prototype.GetChatContent = function (messageId, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ _id: new ObjectID(messageId) }).toArray(function (err, results) {
                    callback(err, results);
                    db.close();
                });
            });
        };
        ChatRoomManager.prototype.getUnreadMsgCountAndLastMsgContentInRoom = function (roomId, lastAccessTime, callback) {
            var self = this;
            var isoDate = new Date(lastAccessTime).toISOString();
            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL).then(function (db) {
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                collection.createIndex({ rid: 1, createTime: 1 }, { background: true, w: 1 }).then(function (indexName) {
                    collection.find({ rid: roomId.toString(), createTime: { $gt: new Date(isoDate) } })
                        .project({ _id: 1 }).sort({ createTime: 1 }).toArray().then(function (docs) {
                        db.close();
                        if (docs.length > 0) {
                            self.roomDAL.getLastMsgContentInMessagesIdArray(docs, function (err, res) {
                                if (!!res) {
                                    callback(null, { count: docs.length, message: res });
                                }
                                else {
                                    callback(null, { count: docs.length });
                                }
                            });
                        }
                        else {
                            self.roomDAL.getLastMessageContentOfRoom(roomId, function (err, res) {
                                if (!!res) {
                                    callback(null, { count: docs.length, message: res });
                                }
                                else {
                                    callback(null, { count: docs.length });
                                }
                            });
                        }
                    }).catch(function (err) {
                        db.close();
                        callback(new Error("GetUnreadMsgOfRoom by query date is no response."), null);
                    });
                }).catch(function (err) {
                    db.close();
                    console.error("createIndex fail...");
                });
            }).catch(function (err) {
                console.error("Cannot connect database.");
            });
        };
        /**
         * Retrive all room in db and then get all members from each room.
         */
        ChatRoomManager.prototype.getAllRooms = function (cb) {
            this.roomDAL.getAllRooms(function (res) {
                cb(res);
            });
        };
        return ChatRoomManager;
    }());
    ChatRoomManager._Instance = null;
    Controller.ChatRoomManager = ChatRoomManager;
    var RoomDataAccess = (function () {
        function RoomDataAccess() {
            this.userManager = UserManager_1.UserManager.getInstance();
        }
        RoomDataAccess.prototype.findProjectBaseGroups = function (userId, callback) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            }, { type: Room.RoomType.projectBaseGroup, status: Room.RoomStatus.active, members: { $elemMatch: { id: userId } } });
        };
        RoomDataAccess.prototype.findPrivateGroupChat = function (uid, callback) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            }, { type: Room.RoomType.privateGroup, members: { $elemMatch: { id: uid } } });
        };
        /**
        * return : =>
        * unread msgs count.
        * type of msg,
        * msg.body
        */
        RoomDataAccess.prototype.getLastMsgContentInMessagesIdArray = function (docs, callback) {
            var lastDoc = docs[docs.length - 1];
            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ _id: new ObjectID(lastDoc._id) }).limit(1).toArray(function (err, docs) {
                    if (!docs) {
                        callback(new Error("getLastMsgContentInMessagesIdArray error."), docs);
                    }
                    else {
                        callback(null, docs[0]);
                    }
                    db.close();
                });
            });
        };
        RoomDataAccess.prototype.getLastMessageContentOfRoom = function (rid, callback) {
            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                collection.createIndex({ rid: 1 }, { background: true, w: 1 }).then(function (indexName) {
                    // Find newest message documents
                    collection.find({ rid: rid.toString() }).sort({ createTime: -1 }).limit(1).toArray(function (err, docs) {
                        if (!docs || err) {
                            callback(err, null);
                        }
                        else {
                            callback(null, docs[0]);
                        }
                        db.close();
                    });
                }).catch(function (err) {
                    db.close();
                    console.error("Create index fail.", err);
                });
            });
        };
        /**
         * Get all rooms and then return all info of { _id, members } to array of roomModel;.
         */
        RoomDataAccess.prototype.getAllRooms = function (callback) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(res);
            }, {});
        };
        RoomDataAccess.prototype.createPrivateGroup = function (groupName, memberIds, callback) {
            var self = this;
            var members = new Array();
            memberIds.forEach(function (val, id, arr) {
                var member = new Room.Member();
                member.id = val;
                members.push(member);
            });
            var newRoom = new Room.Room();
            newRoom.name = groupName;
            newRoom.type = Room.RoomType.privateGroup;
            newRoom.members = members;
            newRoom.createTime = new Date();
            dbClient.InsertDocument(MDb.DbController.roomColl, function (err, docs) {
                console.log("Create new group to db.", docs.length);
                if (docs !== null) {
                    callback(null, docs);
                }
                else {
                    callback(new Error("cannot insert new group to db collection."), null);
                }
            }, newRoom);
        };
        RoomDataAccess.prototype.createProjectBaseGroup = function (groupName, members, callback) {
            var newRoom = new Room.Room();
            newRoom.name = groupName;
            newRoom.type = Room.RoomType.projectBaseGroup;
            newRoom.members = members;
            newRoom.createTime = new Date();
            newRoom.status = Room.RoomStatus.active;
            newRoom.nodeId = 0;
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(MDb.DbController.roomColl);
                // Find some documents
                collection.insertOne(newRoom, function (err, result) {
                    assert.equal(null, err);
                    callback(err, result.ops);
                    db.close();
                });
            });
        };
        RoomDataAccess.prototype.userUpdateGroupImage = function (roomId, newUrl, callback) {
            var self = this;
            dbClient.UpdateDocument(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            }, { _id: new ObjectID(roomId) }, { $set: { image: newUrl } }, { w: 1, upsert: true });
        };
        RoomDataAccess.prototype.addGroupMembers = function (roomId, members, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                // Get the documents collection
                var collection = db.collection(MDb.DbController.roomColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(roomId) }, { $push: { members: { $each: members } } }, function (err, result) {
                    assert.equal(null, err);
                    if (err) {
                        callback(new Error(err.message), null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        RoomDataAccess.prototype.removeGroupMembers = function (roomId, members, callback) {
            async.eachSeries(members, function iterator(item, errCb) {
                MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                    if (err) {
                        return console.dir(err);
                    }
                    // Get the documents collection
                    var collection = db.collection(MDb.DbController.roomColl);
                    // Find some documents
                    collection.updateOne({ _id: new ObjectID(roomId) }, { $pull: { members: { id: item.id } } }, function (err, result) {
                        assert.equal(null, err);
                        if (err) {
                            errCb(new Error(err.message));
                        }
                        else {
                            errCb();
                        }
                        db.close();
                    });
                });
            }, function done(err) {
                if (err) {
                    console.error('removeGroupMembers has a problem!', err.message);
                    callback(err, null);
                }
                else {
                    callback(null, "removeGroupMembers success.");
                }
            });
        };
        RoomDataAccess.prototype.editGroupName = function (roomId, newGroupName, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                // Get the documents collection
                var collection = db.collection(MDb.DbController.roomColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(roomId) }, { $set: { name: newGroupName } }, function (err, result) {
                    assert.equal(null, err);
                    if (err) {
                        callback(new Error(err.message), null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        RoomDataAccess.prototype.editMemberInfoInProjectBase = function (roomId, member, callback) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                // Get the collection
                var col = db.collection(MDb.DbController.roomColl);
                col.updateOne({ _id: new ObjectID(roomId), "members.id": member.id }, { $set: { "members.$": member } }, function (err, result) {
                    assert.equal(1, result.matchedCount);
                    callback(null, result);
                    // Finish up test
                    db.close();
                });
            });
        };
        RoomDataAccess.prototype.updateWhoReadMessage = function (messageId, uid, callback) {
            dbClient.UpdateDocument(MDb.DbController.messageColl, function (res2) {
                if (!res2) {
                    callback(new Error("updateChatRecordWhoRead fail."), null);
                }
                else {
                    callback(null, res2);
                }
            }, { _id: new ObjectID(messageId) }, { $addToSet: { readers: uid } });
        };
        /*
         * Require: message_id.
         * **************************
         * Return: reader fields of target messageId.
         */
        RoomDataAccess.prototype.getWhoReadMessage = function (messageId, callback) {
            dbClient.FindDocument(MDb.DbController.messageColl, function (result) {
                if (!result) {
                    callback(new Error("getWhoReadMessage fail."), null);
                }
                else {
                    callback(null, result);
                }
            }, { _id: new ObjectID(messageId) }, { sender: 1, readers: 1 });
        };
        return RoomDataAccess;
    }());
})(Controller || (Controller = {}));
module.exports = Controller;
