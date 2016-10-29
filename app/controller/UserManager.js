"use strict";
const Room = require('../model/Room');
const RoomAccessData_1 = require('../model/RoomAccessData');
const Mdb = require('../db/dbClient');
const mongodb = require('mongodb');
const async = require('async');
const assert = require('assert');
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const DbClient = Mdb.DbController.DbClient.GetInstance();
;
class UserManager {
    constructor() {
        this.userDataAccess = new UserDataAccessService();
        this.onInsertRoomAccessInfoDone = function (uid, rid, callback) {
            MongoClient.connect(Mdb.DbController.chatDB).then(db => {
                let collection = db.collection(Mdb.DbController.userColl);
                collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: 1 }).limit(1).toArray().then(docs => {
                    console.log("find roomAccessInfo of uid %s", uid, docs[0]);
                    collection.updateOne({ _id: new ObjectID(docs[0]._id), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": new Date() } }, { w: 1 }).then(result => {
                        console.log("updated roomAccess.accessTime: ", result.result);
                        db.close();
                        callback(null, result);
                    }).catch(err => {
                        db.close();
                        callback(new Error("cannot update roomAccess.accessTime."), null);
                    });
                }).catch(err => {
                    db.close();
                    callback(new Error("cannot find roomAccess info of target uid."), null);
                });
            }).catch(err => {
                console.error("Cannot connect database", err);
            });
        };
        if (UserManager._instance) {
            console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
        }
        UserManager._instance = this;
    }
    static getInstance() {
        if (!UserManager._instance) {
            UserManager._instance = new UserManager();
        }
        return UserManager._instance;
    }
    getLastProfileChanged(uid, callback) {
        this.userDataAccess.getLastProfileChanged(uid, callback);
    }
    updateImageProfile(uid, newUrl, callback) {
        this.userDataAccess.updateImageProfile(uid, newUrl, callback);
    }
    getRoomAccessForUser(uid, callback) {
        this.userDataAccess.getRoomAccessForUser(uid, callback);
    }
    getRoomAccessOfRoom(uid, rid, callback) {
        this.userDataAccess.getRoomAccessOfRoom(uid, rid, callback);
    }
    updateLastAccessTimeOfRoom(uid, rid, date, callback) {
        let self = this;
        async.waterfall([function (cb) {
                MongoClient.connect(Mdb.DbController.chatDB).then(db => {
                    let collection = db.collection(Mdb.DbController.userColl);
                    collection.find({ _id: new ObjectID(uid) }).limit(1).project({ roomAccess: 1 }).toArray().then(docs => {
                        cb(null, docs[0]);
                        db.close();
                    }).catch(error => {
                        cb(new Error("cannot find roomAccess info of target uid."), null);
                        db.close();
                    });
                }).catch(err => {
                    console.error("Cannot connect database", err);
                });
            },
            function (arg, cb) {
                if (arg && arg.roomAccess) {
                    self.userDataAccess.findRoomAccessDataMatchWithRoomId(uid, rid, date, cb);
                }
                else {
                    //<!-- insert roomAccess info field in user data collection.
                    self.userDataAccess.insertRoomAccessInfoField(uid, rid, cb);
                }
            }], function done(err, result) {
            callback(err, result);
        });
    }
    AddRoomIdToRoomAccessField(roomId, memberIds, date, callback) {
        var self = this;
        async.each(memberIds, function (element, cb) {
            self.userDataAccess.AddRidToRoomAccessField(element, roomId, date, (error, response) => {
                cb();
            });
        }, function (errCb) {
            if (!errCb) {
                callback(null, true);
            }
        });
    }
    AddRoomIdToRoomAccessFieldForUser(roomId, userId, date, callback) {
        this.userDataAccess.AddRidToRoomAccessField(userId, roomId, date, callback);
    }
    updateFavoriteMembers(editType, member, uid, callback) {
        if (editType === "add") {
            this.userDataAccess.addFavoriteMembers(member, uid, callback);
        }
        else if (editType === "remove") {
            this.userDataAccess.removeFavoriteMembers(member, uid, callback);
        }
    }
    updateFavoriteGroups(editType, group, uid, callback) {
        if (editType === "add") {
            this.userDataAccess.addFavoriteGroup(group, uid, callback);
        }
        else if (editType === "remove") {
            this.userDataAccess.removeFavoriteGroup(group, uid, callback);
        }
    }
    updateClosedNoticeUsersList(editType, member, uid, callback) {
        if (editType === "add") {
            this.userDataAccess.addClosedNoticeUsersList(member, uid, callback);
        }
        else if (editType === "remove") {
            this.userDataAccess.removeClosedNoticeUsersList(member, uid, callback);
        }
    }
    updateClosedNoticeGroups(editType, group, uid, callback) {
        if (editType === "add") {
            this.userDataAccess.addClosedNoticeGroupList(group, uid, callback);
        }
        else if (editType === "remove") {
            this.userDataAccess.removeClosedNoticeGroupList(group, uid, callback);
        }
    }
    getMemberProfile(uid, callback) {
        let query = { _id: new ObjectID(uid) };
        let projection = { roomAccess: 0 };
        this.userDataAccess.getUserProfile(query, projection, callback);
    }
    /**
    * Check creator permission for create ProjectBase Group requesting.
    * res will return { _id, role } of user model.
    */
    getCreatorPermission(creator, callback) {
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
    checkUnsubscribeRoom(userId, roomType, roomId, callback) {
        if (roomType === Room.RoomType.privateGroup) {
            MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var user = db.collection(Mdb.DbController.userColl);
                user.find({ _id: new ObjectID(userId), closedNoticeGroups: roomId }).limit(1).toArray(function (err, results) {
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
            MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
UserManager._instance = null;
exports.UserManager = UserManager;
class UserDataAccessService {
    constructor() {
        this.findRoomAccessDataMatchWithRoomId = function (uid, rid, date, callback) {
            if (rid === null) {
                console.warn("rid is invalid: careful for use this func: ", rid);
            }
            MongoClient.connect(Mdb.DbController.chatDB, function (err, db) {
                let collection = db.collection(Mdb.DbController.userColl);
                // Peform a simple find and return all the documents
                collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid.toString() } } }).toArray(function (err, docs) {
                    let printR = (docs) ? docs : null;
                    console.log("find roomAccessInfo of uid: %s match with rid: %s :: ", uid, rid, printR);
                    if (!docs || !docs[0].roomAccess) {
                        //<!-- Push new roomAccess data. 
                        let newRoomAccessInfo = new RoomAccessData_1.default();
                        newRoomAccessInfo.roomId = rid.toString();
                        newRoomAccessInfo.accessTime = date;
                        collection.updateOne({ _id: new ObjectID(uid) }, { $push: { roomAccess: newRoomAccessInfo } }, { w: 1 }).then(result => {
                            console.log("Push new roomAccess.: ", result.result);
                            db.close();
                            callback(null, result);
                        }).catch(err => {
                            db.close();
                            callback(new Error("cannot update roomAccess.accessTime."), null);
                        });
                    }
                    else {
                        //<!-- Update if data exist.
                        collection.updateOne({ _id: new ObjectID(uid), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": date } }, { w: 1 }).then(result => {
                            console.log("Updated roomAccess.accessTime: ", result.result);
                            db.close();
                            callback(null, result);
                        }).catch(err => {
                            db.close();
                            callback(new Error("cannot update roomAccess.accessTime."), null);
                        });
                    }
                });
            });
        };
        this.insertRoomAccessInfoField = function (uid, rid, callback) {
            let newRoomAccessInfos = new Array();
            newRoomAccessInfos[0] = new RoomAccessData_1.default();
            newRoomAccessInfos[0].roomId = rid;
            newRoomAccessInfos[0].accessTime = new Date();
            MongoClient.connect(Mdb.DbController.chatDB).then(db => {
                // Get a collection
                let collection = db.collection(Mdb.DbController.userColl);
                collection.updateOne({ _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } }, { upsert: true, w: 1 }).then(result => {
                    console.log("Upsert roomAccess array field.", result.result);
                    UserManager.getInstance().onInsertRoomAccessInfoDone(uid, rid, callback);
                    db.close();
                }).catch(err => {
                    db.close();
                });
            }).catch(err => {
                console.error("Cannot connect database", err);
            });
        };
    }
    getLastProfileChanged(uid, callback) {
        DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
            callback(null, result);
        }, { _id: new ObjectID(uid) }, { lastEditProfile: 1 });
    }
    getRoomAccessForUser(uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB).then(db => {
            let userColl = db.collection(Mdb.DbController.userColl);
            userColl.find({ _id: new ObjectID(uid) }).project({ roomAccess: 1 }).limit(1).toArray().then(docs => {
                db.close();
                callback(null, docs);
            }).catch(err => {
                db.close();
                callback(err, null);
            });
        }).catch(err => {
            callback(err, null);
        });
    }
    AddRidToRoomAccessField(uid, roomId, date, callback) {
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
                        if (callback !== null)
                            callback(err, null);
                    }
                    else {
                        console.log("findRoomAccessDataMatchWithRoomId: ", res.result);
                        if (callback !== null)
                            callback(null, res);
                    }
                });
            }
        }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
    }
    InsertMembersFieldsToUserModel(uid, roomId, date, callback) {
        var newRoomAccessInfos = new Array();
        newRoomAccessInfos[0] = new RoomAccessData_1.default();
        newRoomAccessInfos[0].roomId = roomId;
        newRoomAccessInfos[0].accessTime = date;
        DbClient.UpdateDocument(Mdb.DbController.userColl, (res) => {
            console.log("InsertMembersFieldsToUserModel: ", res.result);
            if (callback !== null)
                callback(null, res);
        }, { _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } });
    }
    updateImageProfile(uid, newUrl, callback) {
        DbClient.UpdateDocument(Mdb.DbController.userColl, function (res) {
            callback(null, res);
        }, { _id: new ObjectID(uid) }, { $set: { image: newUrl, lastEditProfile: new Date() } }, { w: 1, upsert: true });
    }
    getRoomAccessOfRoom(uid, rid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB).then(db => {
            // Get the documents collection
            let collection = db.collection(Mdb.DbController.userColl);
            collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid } }, _id: 0 }).limit(1).toArray()
                .then(docs => {
                db.close();
                console.log("getRoomAccessOfRoom", docs);
                callback(null, docs[0]);
            })
                .catch(err => {
                console.error("getRoomAccessOfRoom: ", err);
                db.close();
                callback(err, null);
            });
        }).catch(err => {
            console.error("Cannot connect database", err);
        });
    }
    getUserProfile(query, projection, callback) {
        MongoClient.connect(Mdb.DbController.chatDB).then(db => {
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
        }).catch(err => {
            console.error("Cannot connect database", err);
            callback(err, null);
        });
    }
    getRole(creator, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    addFavoriteMembers(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    removeFavoriteMembers(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    addFavoriteGroup(group, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    removeFavoriteGroup(group, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    addClosedNoticeUsersList(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    removeClosedNoticeUsersList(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    addClosedNoticeGroupList(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
    removeClosedNoticeGroupList(member, uid, callback) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
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
exports.UserDataAccessService = UserDataAccessService;
