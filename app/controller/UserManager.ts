/// <reference path="../../typings/tsd.d.ts" />

import User = require('../model/User');
import Room = require('../model/Room');
import RoomAccess = require('../model/RoomAccessData');
import Mdb = require('../db/dbClient');
import mongodb = require('mongodb');
import async = require('async');
import mongoose = require('mongoose');
import generic = require('../util/collections');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
import assert = require('assert');
var DbClient = Mdb.DbController.DbClient.GetInstance();

export module Controller {
    export interface IUserDict {
        [id: string]: User.User;
    };

    export class UserManager {
        private static _instance: UserManager = null;
        private userDataAccess: UserDataAccessService = new UserDataAccessService();

        constructor() {
            if (UserManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            UserManager._instance = this;
        }

        public static getInstance(): UserManager {
            if (!UserManager._instance) {
                UserManager._instance = new UserManager();
            }
            return UserManager._instance;
        }

        public getLastProfileChanged(uid: string, callback: (err, res) => void) {
            this.userDataAccess.getLastProfileChanged(uid, callback);
        }

        public updateImageProfile(uid: string, newUrl: string, callback: (err, res) => void) {
            this.userDataAccess.updateImageProfile(uid, newUrl, callback);
        }

        public getRoomAccessForUser(uid: string, callback: (err, res) => void) {
            this.userDataAccess.getRoomAccessForUser(uid, callback);
        }

        public getRoomAccessOfRoom(uid: string, rid: string, callback: (err, res) => void) {
            this.userDataAccess.getRoomAccessOfRoom(uid, rid, callback);
        }

        public updateLastAccessTimeOfRoom(uid: string, rid: string, date: Date, callback: (err: any, res: any) => void) {
            var self = this;

            async.waterfall([function (cb) {
                DbClient.FindDocument(Mdb.DbController.userColl, function (roomAccessResult) {
                    if (roomAccessResult === null) {
                        cb(new Error("cannot find roomAccess info of target uid."), null);
                    }
                    else {
                        cb(null, roomAccessResult);
                    }
                }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
            }
                , function (arg, cb) {
                    if (arg && arg.roomAccess) {
                        self.userDataAccess.findRoomAccessDataMatchWithRoomId(uid, rid, date, cb);
                    }
                    else {
                        //<!-- insert roomAccess info field in user data collection.
                        self.userDataAccess.insertRoomAccessInfoField(uid, rid, cb);
                    }
                }],
                function (err, result) {
                    callback(err, result);
                });
        }

        onInsertRoomAccessInfoDone = function (uid: string, rid: string, callback): void {
            DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
                var printR = (result !== null) ? result : null;
                console.log("find roomAccessInfo of uid %s", uid, printR);

                if (result === null) {
                    callback(new Error("cannot find roomAccess info of target uid."), null);
                }
                else {
                    DbClient.UpdateDocument(Mdb.DbController.userColl, function (result) {
                        console.log("updated roomAccess.accessTime: ", result.result);
                        if (result === null) {
                            callback(new Error("cannot update roomAccess.accessTime."), null);
                        }
                        else {
                            callback(null, result);
                        }
                    }, { _id: new ObjectID(result._id), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": new Date() } }, { w: 1 });
                }
            }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
        }

        public AddRoomIdToRoomAccessField(roomId: string, memberIds: string[], date: Date, callback: (err, res: boolean) => void) {
            var self = this;
            async.each(memberIds, function (element: string, cb) {
                var user = new User.User();
                user.id = element;
                self.userDataAccess.AddRidToRoomAccessField(element, roomId, date, (error, response) => {
                    cb();
                });
            }, function (errCb) {
                if (!errCb) {
                    callback(null, true);
                }
            });
        }
        public AddRoomIdToRoomAccessFieldForUser(roomId: string, userId: string, date: Date, callback: (err, res) => void) {
            this.userDataAccess.AddRidToRoomAccessField(userId, roomId, date, callback);
        }

        public updateFavoriteMembers(editType: string, member: string, uid: string, callback: (err, res) => void) {
            if (editType === "add") {
                this.userDataAccess.addFavoriteMembers(member, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeFavoriteMembers(member, uid, callback);
            }
        }

        public updateFavoriteGroups(editType: string, group: string, uid: string, callback: (err, res) => void) {
            if (editType === "add") {
                this.userDataAccess.addFavoriteGroup(group, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeFavoriteGroup(group, uid, callback);
            }
        }

        public updateClosedNoticeUsersList(editType: string, member: string, uid: string, callback: (err, res) => void) {
            if (editType === "add") {
                this.userDataAccess.addClosedNoticeUsersList(member, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeClosedNoticeUsersList(member, uid, callback);
            }
        }
        
        public updateClosedNoticeGroups(editType: string, group: string, uid: string, callback: (err, res) => void) {
            if (editType === "add") {
                this.userDataAccess.addClosedNoticeGroupList(group, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeClosedNoticeGroupList(group, uid, callback);
            }
        }
        
        //region <!-- Other user.

        public getMemberProfile(uid: string, callback: (err, res) => void) {
            var query = { _id: new ObjectID(uid) };
            var projection = { roomAccess: 0 };
            this.userDataAccess.getUserProfile(query, projection, callback);
        }

        //endregion


        /**
        * Check creator permission for create ProjectBase Group requesting.
        * res will return { _id, role } of user model.
        */
        public getCreatorPermission(creator: string, callback: (err, res) => void) {
            this.userDataAccess.getRole(creator, (err, res) => {
                //<!-- res will return { _id, role } of user model.
                if (err || res === null) {
                    callback(err, null);
                }
                else {
                    callback(null, res);
                }
            });
        }

        public checkUnsubscribeRoom(userId: string, roomType: Room.RoomType, roomId: string, callback: Function) {
            if (roomType === Room.RoomType.privateGroup) {
                MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                    if (err) {
                        return console.dir(err);
                    }
                    assert.equal(null, err);

                    // Get the documents collection
                    var user = db.collection(Mdb.DbController.userColl);

                    user.find({ _id: new ObjectID(userId), closedNoticeGroups: roomId }).limit(1).toArray(function(err, results) {
                        if (err || results === null) {
                            callback(err, null);
                        }
                        else {
                            callback(null, results);
                        }

                        db.close();
                    });
                });
            }
            else if (roomType === Room.RoomType.privateChat) {
                MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                    if (err) {
                        return console.dir(err);
                    }
                    assert.equal(null, err);

                    // Get the documents collection
                    var user = db.collection(Mdb.DbController.userColl);

                    user.find({ _id: new ObjectID(userId), closedNoticeUsers: roomId }).limit(1).toArray((err, docs) => {
                        if (err || docs === null) {
                            callback(err, null);
                        }
                        else {
                            callback(null, docs);
                        }

                        db.close();
                    });
                });
            }
        }
    }

    export class UserDataAccessService {
        constructor() {
        }

        public getLastProfileChanged(uid: string, callback: (err, res) => void) {
            DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
                callback(null, result);
            }, { _id: new ObjectID(uid) }, { lastEditProfile: 1 });
        }

        public getRoomAccessForUser(uid: string, callback: (err, res) => void) {
            DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
                callback(null, result);
            }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
        }


        AddRidToRoomAccessField(uid: string, roomId: string, date: Date, callback: (err, res) => void) {
            var self = this;
            DbClient.FindDocument(Mdb.DbController.userColl, function (res) {
                if (!res.roomAccess) {
                    self.InsertMembersFieldsToUserModel(uid, roomId, date, callback);
                }
                else {
                    //<!-- add rid to MembersFields.
                    self.findRoomAccessDataMatchWithRoomId(uid, roomId, date, (err, res) => {
                        if (err) {
                            console.error("findRoomAccessDataMatchWithRoomId: ", err);
                            if(callback !== null)
                                callback(err, null);
                        }
                        else {
                            console.log("findRoomAccessDataMatchWithRoomId: ", res.result);
                            if(callback !== null)
                                callback(null, res);
                        }
                    });
                }
            }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
        }

        private InsertMembersFieldsToUserModel(uid: string, roomId: string, date: Date, callback: (err: any, res: any) => void) {
            var newRoomAccessInfos: RoomAccess.RoomAccessData[] = new Array<RoomAccess.RoomAccessData>();
            newRoomAccessInfos[0] = new RoomAccess.RoomAccessData();
            newRoomAccessInfos[0].roomId = roomId;
            newRoomAccessInfos[0].accessTime = date;

            DbClient.UpdateDocument(Mdb.DbController.userColl, (res) => {
                console.log("InsertMembersFieldsToUserModel: ", res.result);
                if(callback !== null)
                    callback(null, res);
            }, { _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } });
        }

        findRoomAccessDataMatchWithRoomId = function (uid: string, rid: string, date: Date, callback: (err: any, res: any) => void) {
            if (rid === null) {
                console.warn("rid is invalid: careful for use this func: ", rid);
            }

            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {

                var collection = db.collection(Mdb.DbController.userColl);

                // Peform a simple find and return all the documents
                collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid.toString() } } }).toArray(function (err, docs) {
                    var printR = (docs) ? docs : null;
                    console.log("find roomAccessInfo of uid: %s match with rid: %s :: ", uid, rid, printR);

                    if (!docs || !docs[0].roomAccess) {
                        //<!-- Push new roomAccess data. 
                        var newRoomAccessInfo = new RoomAccess.RoomAccessData();
                        newRoomAccessInfo.roomId = rid.toString();
                        newRoomAccessInfo.accessTime = date;

                        DbClient.UpdateDocument(Mdb.DbController.userColl, function (result) {
                            console.log("Push new roomAccess.: ", result.result);
                            if (result === null) {
                                callback(new Error("cannot update roomAccess.accessTime."), null);
                            }
                            else {
                                callback(null, result);
                            }
                        }, { _id: new ObjectID(uid) }, { $push: { roomAccess: newRoomAccessInfo } }, { w: 1 });
                    }
                    else {
                        //<!-- Update if data exist.
                        DbClient.UpdateDocument(Mdb.DbController.userColl, function (result) {
                            console.log("Updated roomAccess.accessTime: ", result.result);
                            if (result === null) {
                                callback(new Error("cannot update roomAccess.accessTime."), null);
                            }
                            else {
                                callback(null, result);
                            }
                        }, { _id: new ObjectID(uid), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": date } }, { w: 1 });
                    }

                    db.close();
                });
            });
        }

        insertRoomAccessInfoField = function (id: string, rid: string, callback): void {
            var newRoomAccessInfos: RoomAccess.RoomAccessData[] = new Array<RoomAccess.RoomAccessData>();
            newRoomAccessInfos[0] = new RoomAccess.RoomAccessData();
            newRoomAccessInfos[0].roomId = rid;
            newRoomAccessInfos[0].accessTime = new Date();

            DbClient.UpdateDocument(Mdb.DbController.userColl, function (result) {
                console.log("Upsert roomAccess array field.", result.result);

                UserManager.getInstance().onInsertRoomAccessInfoDone(id, rid, callback);
            }, { _id: new ObjectID(id) }, { $set: { roomAccess: newRoomAccessInfos } }, { w: 1, upsert: true });
        }

        public updateImageProfile(uid: string, newUrl: string, callback: (err, res) => void) {
            DbClient.UpdateDocument(Mdb.DbController.userColl, function (res) {
                callback(null, res);
            }, { _id: new ObjectID(uid) }, { $set: { image: newUrl, lastEditProfile: new Date() } }, { w: 1, upsert: true });
        }

        public getRoomAccessOfRoom(uid: string, rid: string, callback: (err, res) => void) {
            console.log("getRoomAccess for room %s of user %s", rid, uid);
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function(err:Error, db:mongodb.Db) {
                if (err) { return console.dir(err); }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);

                collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid } }, _id: 0 }).limit(1).toArray((err, docs) => {
                    if (err) {
                        console.error("getRoomAccessOfRoom: ", err);
                        callback(err, null);
                    }
                    else {
                        console.log("getRoomAccessOfRoom", docs);
                        callback(null, docs[0]);
                    }
                    db.close();
                });
            });
        }

        public getUserProfile(query: any, projection: any, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) { return console.dir(err); }
                assert.equal(null, err);    
                
                // Get the documents collection
                let collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find(query).project(projection).limit(1).toArray((err, results) => {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        callback(null, results);
                    }

                    db.close();
                });
            });
        }

        public getRole(creator: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find({ _id: new ObjectID(creator) }).project({ role: 1 }).limit(1).toArray((err, results) => {
                    if (err || results === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, results);
                    }

                    db.close();
                });
            });
        }

        public addFavoriteMembers(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);

                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteUsers: member } }, { upsert: true }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }
        public removeFavoriteMembers(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteUsers: member } }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }


        public addFavoriteGroup(group: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);

                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteGroups: group } }, { upsert: true }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }
        public removeFavoriteGroup(group: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteGroups: group } }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }

        public addClosedNoticeUsersList(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);

                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeUsers: member } }, { upsert: true }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }
        public removeClosedNoticeUsersList(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeUsers: member } }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }

        public addClosedNoticeGroupList(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);

                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeGroups: member } }, { upsert: true }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }
        public removeClosedNoticeGroupList(member: string, uid: string, callback: (err, res) => void) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);

                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeGroups: member } }, (err, result) => {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }

                    db.close();
                });
            });
        }
    }
}