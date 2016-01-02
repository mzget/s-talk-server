/// <reference path="../../typings/tsd.d.ts" />
import mongodb = require('mongodb');
import async = require('async');
import MDb = require('../db/dbClient');
import Room = require("../model/Room");
import message = require("../model/Message");
import UserManager = require('./UserManager');
var ObjectID = mongodb.ObjectID;
var dbClient = MDb.DbController.DbClient.GetInstance();
var Db = mongodb.Db,
    MongoClient = mongodb.MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').Bson,
    assert = require('assert');

module Controller {
    export class ChatRoomManager {

        private static _Instance: ChatRoomManager = null;
        private userManager = UserManager.Controller.UserManager.getInstance();
        private roomDAL = new RoomDataAccess();

        constructor() {
            if (ChatRoomManager._Instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            ChatRoomManager._Instance = this;
        }

        public static getInstance(): ChatRoomManager {
            if (!ChatRoomManager._Instance) {
                ChatRoomManager._Instance = new ChatRoomManager();
            }
            return ChatRoomManager._Instance;
        }

        public GetChatRoomInfo(query, projections, callback: (res: any) => void) {
            dbClient.FindDocument(MDb.DbController.roomColl, callback, query, projections);
        }

        public getProjectBaseGroups(userId: string, callback: (err, res) => void) {
            this.roomDAL.findProjectBaseGroups(userId, callback);
        }

        public getPrivateGroupChat(uid: string, callback: (err, res) =>void) {
            this.roomDAL.findPrivateGroupChat(uid, callback);
        }

        public createPrivateChatRoom(doc, callback: (err, res) => void) {
            var self = this;
            var members = new Array<Room.Member>();
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

            dbClient.InsertDocument(MDb.DbController.roomColl, (err, res) => {
                if(err) {
                   console.error("CreatePrivateRoom fail.", err); 
                }
                else {
                    callback(null, res[0]);
                }
            }, { _id: new ObjectID(_room._id), type: _room.type, members: _room.members, createTime: _room.createTime });
        }

        public createPrivateGroup(groupName: string, memberIds: string[], callback: (err, res) => void) {
            this.roomDAL.createPrivateGroup(groupName, memberIds, callback);
        }

        public updateGroupImage(roomId: string, newUrl: string, callback: (err, res) => void) {
            this.roomDAL.userUpdateGroupImage(roomId, newUrl, callback);
        }

        public editGroupMembers(editType: string, roomId: string, members: Room.Member[], callback: (err, res) => void) {
            if (editType === "add") {
                this.roomDAL.addGroupMembers(roomId, members, callback);
            }
            else if (editType == "remove") {
                this.roomDAL.removeGroupMembers(roomId, members, callback);
            }
        }

        public editGroupName(roomId: string, newGroupName: string, callback: (err, res) => void) {
            this.roomDAL.editGroupName(roomId, newGroupName, callback);
        }

        public AddChatRecord(object: message.Message, callback: (err, docs) => void) {
            dbClient.InsertDocument(MDb.DbController.messageColl, callback, object);
        }

        
        public createProjectBaseGroup(groupName: string, members: Room.Member[], callback: (err, res) => void) {
            this.roomDAL.createProjectBaseGroup(groupName, members, callback);
        }

        public editMemberInfoInProjectBase(roomId: string, member: Room.Member, callback: (Error, res) => void) {
            this.roomDAL.editMemberInfoInProjectBase(roomId, member, callback);
        } 

        /*
        * Require 
        *@roomId for query chat record in room.
        *@lastAccessTime for query only message who newer than lastAccessTime.
        */
        public getNewerMessageOfChatRoom(roomId: string, isoDate: Date, callback: (err, res) => void) {
            this.roomDAL.getNewerMessageRecords(roomId, isoDate, callback);
        }

        public updateChatRecordContent(messageId: string, content: string, callback: (err, res) => void) {
            dbClient.UpdateDocument(MDb.DbController.messageColl, (res) => {
                callback(null, res);
            }, { _id: new ObjectID(messageId) }, { $set: { body: content } });
        }

        public updateWhoReadMessage(messageId: string, uid: string, callback: (err, res) => void) {
            this.roomDAL.updateWhoReadMessage(messageId, uid, callback);
        }

        /*
        * Get last limit query messages of specific user and room then return messages info. 
        */
        public getMessagesReadersOfUserXInRoomY(userId: string, roomId: string, callback: (err, res) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ rid: roomId, sender: userId }, { readers: 1 }).limit(20).sort({ createTime: -1 }).toArray(function (err, docs) {
                    assert.equal(null, err);
                    if (!docs) {
                        callback(new Error("getMessagesInfoOfUserXInRoomY is no response."), err);
                    }
                    else {
                        console.log("getMessagesInfoOfUserXInRoomY found the following records", docs);
                        callback(null, docs);
                    }
                    db.close();
                });
            });
        }
        
        /**
         * Require: message_id.
         * **************************
         * Return: sender of target message.
         * Return: reader fields of target messageId.
         */
        public getWhoReadMessage(messageId: string, callback: (err, res) => void) {
            this.roomDAL.getWhoReadMessage(messageId, callback);
        }

        public GetChatContent(messageId: string, callback: (err, res: any[]) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ _id: new ObjectID(messageId)}).toArray((err : Error, results: any[]) => {
                    callback(err, results);
                    
                    db.close();
                });
            });
        }

        public getUnreadMsgCountAndLastMsgContentInRoom(roomId: string, lastAccessTime: string, callback: Function) {
            console.info("GetUnreadMsgOfRoom: %s lastacc: %s", roomId, lastAccessTime);
            var isoDate = new Date(lastAccessTime).toISOString();

            this.roomDAL.getUnreadMsgCountAndLastMsgContentInRoom(roomId, isoDate, callback);
        }
        
        /**
         * Retrive all room in db and then get all members from each room. 
         */
        public getAllRooms(cb: (result: Array<any>) => void) {
            this.roomDAL.getAllRooms(function (res) {
                cb(res)
            });
        }

    }
    
    class RoomDataAccess {
        private userManager = UserManager.Controller.UserManager.getInstance();

        findProjectBaseGroups(userId: string, callback: (err, res) => void) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            }, { type: Room.RoomType.projectBaseGroup, status: Room.RoomStatus.active, members: { $elemMatch: { id: userId } } });
        }
        
        findPrivateGroupChat(uid: string, callback: (err, res) => void) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            },  { type: Room.RoomType.privateGroup, members: {$elemMatch: {id:uid}} });
        }

        /**
        * return : =>
        * unread msgs count.
        * type of msg, 
        * msg.body
        */
        private getLastMsgContentInMessagesIdArray(docs: any[], callback: Function) {
            var lastDoc = docs[docs.length - 1];

            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ _id: new ObjectID(lastDoc._id)}).limit(1).toArray(function (err, docs) {
                    console.log("getLastMsgContentInMessagesIdArray found the following records", docs);
                    if (!docs) {
                        callback(new Error("getLastMsgContentInMessagesIdArray error."), docs);
                    }
                    else {
                        callback(null, docs[0]);
                    }
                    db.close();
                });
            });
        }

        private getLastMessageContentOfRoom(rid: string, callback: Function) {
            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find newest message documents
                collection.find({ rid: rid.toString() }).sort({ createTime: -1 }).limit(1).toArray(function (err, docs) {
                    assert.equal(null, err);
                    console.log("getLastMessageContentOfRoom found the following records", docs);
                    if (!docs) {
                        callback(new Error("getLastMessageContentOfRoom by query date is no response."), docs);
                    }
                    else {
                        callback(null, docs[0]);
                    }
                    db.close();
                });
            });
        }

        public getUnreadMsgCountAndLastMsgContentInRoom(rid: string, isoDate: string, callback: Function) {
            var self = this;

            // Use connect method to connect to the Server
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ rid: rid.toString(), createTime: { $gt: new Date(isoDate) } }, { _id: 1 }).sort({ createTime: 1 }).toArray(function (err, docs) {
                    assert.equal(null, err);
                    console.log("findUnreadMsgInRoom found the following records", docs);
                    if (!docs) {
                        callback(new Error("GetUnreadMsgOfRoom by query date is no response."), docs);
                    }
                    else {
                        if (docs.length > 0) {
                            self.getLastMsgContentInMessagesIdArray(docs, function (err, res) {
                                if (!!res) {
                                    callback(null, { count: docs.length, message: res });
                                }
                                else {
                                    callback(null, { count: docs.length });
                                }
                            });
                        }
                        else {
                            self.getLastMessageContentOfRoom(rid, function (err, res) {
                                if (!!res) {
                                    callback(null, { count: docs.length, message: res });
                                }
                                else {
                                    callback(null, { count: docs.length });
                                }
                            });
                        }
                    }
                    db.close();
                });
            });
        }

        public getNewerMessageRecords(rid: string, isoDate: Date, callback: (err, res) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }

                // Get the documents collection
                var collection = db.collection(MDb.DbController.messageColl);
                // Find some documents
                collection.find({ rid: rid, createTime: { $gt: new Date(isoDate.toISOString()) } }).limit(100).sort({ createTime: 1 }).toArray(function (err, docs) {
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
        }

        /**
         * Get all rooms and then return all info of { _id, members } to array of roomModel;.
         */
        getAllRooms(callback:(result:Array<any>)=>void) {
            dbClient.FindDocuments(MDb.DbController.roomColl, function (res) {
                callback(res);
            }, {});
        }

        public createPrivateGroup(groupName: string, memberIds: string[], callback: (err, res) => void) {
            var self = this;
            var members: Array<Room.Member> = new Array<Room.Member>();
            
            memberIds.forEach((val, id, arr) => {
                var member: Room.Member = new Room.Member();
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
        }

        public createProjectBaseGroup(groupName: string, members: Room.Member[], callback: (err, res) => void) {
            var newRoom = new Room.Room();
            newRoom.name = groupName;
            newRoom.type = Room.RoomType.projectBaseGroup;
            newRoom.members = members;
            newRoom.createTime = new Date();
            newRoom.status = Room.RoomStatus.active;
            newRoom.nodeId = 0;

            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(MDb.DbController.roomColl);
                // Find some documents
                collection.insertOne(newRoom, (err, result) => {
                    assert.equal(null, err);

                    callback(err, result.ops);

                    db.close();
                });
            });
        }

        public userUpdateGroupImage(roomId: string, newUrl: string, callback: (err, res) => void) {
            var self = this;

            dbClient.UpdateDocument(MDb.DbController.roomColl, function (res) {
                callback(null, res);
            }, { _id: new ObjectID(roomId) }, { $set: { image: newUrl } }, { w: 1, upsert: true });
        }

        public addGroupMembers(roomId: string, members: Room.Member[], callback: (err, res) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }

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
        }

        public removeGroupMembers(roomId: string, members: Room.Member[], callback: (err, res) => void) {
            async.eachSeries(members, function iterator(item, errCb) {
                MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                    if (err) { return console.dir(err); }

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
        }

        public editGroupName(roomId: string, newGroupName: string, callback: (err, res) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) { return console.dir(err); }

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
        }

        public editMemberInfoInProjectBase(roomId: string, member: Room.Member, callback: (err, res) => void) {
            MongoClient.connect(MDb.DbController.spartanChatDb_URL, (err, db) => {
                // Get the collection
                var col = db.collection(MDb.DbController.roomColl);
                col.updateOne({ _id: new ObjectID(roomId), "members.id": member.id }, { $set: { "members.$": member } }, function (err, result) {
                    assert.equal(1, result.matchedCount);

                    callback(null, result);
                    // Finish up test
                    db.close();
                });
            });
        } 

        public updateWhoReadMessage(messageId: string, uid: string, callback: (err, res) => void) {
            dbClient.UpdateDocument(MDb.DbController.messageColl, function (res2) {
                if (!res2) {
                    callback(new Error("updateChatRecordWhoRead fail."), null);
                }
                else {
                    callback(null, res2);
                }
            }, { _id: new ObjectID(messageId) }, { $addToSet: { readers: uid } }); 
        }
        
        /*
         * Require: message_id.
         * **************************
         * Return: reader fields of target messageId.
         */
        public getWhoReadMessage(messageId: string, callback: (err, res) => void) {
            dbClient.FindDocument(MDb.DbController.messageColl, (result) => {
                if(!result) {
                    callback(new Error("getWhoReadMessage fail."), null);
                }
                else{
                    callback(null, result);
                }
            },
            { _id: new ObjectID(messageId) },
            { sender: 1, readers: 1});
        }
    }
}
export = Controller;