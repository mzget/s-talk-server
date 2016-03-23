/// <reference path="../../typings/tsd.d.ts" />
var User = require('../model/User');
var Room = require('../model/Room');
var RoomAccess = require('../model/RoomAccessData');
var Mdb = require('../db/dbClient');
var mongodb = require('mongodb');
var async = require('async');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var assert = require('assert');
var DbClient = Mdb.DbController.DbClient.GetInstance();
var Controller;
(function (Controller) {
    ;
    var UserManager = (function () {
        function UserManager() {
            this.userDataAccess = new UserDataAccessService();
            this.onInsertRoomAccessInfoDone = function (uid, rid, callback) {
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
            };
            if (UserManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            UserManager._instance = this;
        }
        UserManager.getInstance = function () {
            if (UserManager._instance === null) {
                UserManager._instance = new UserManager();
            }
            return UserManager._instance;
        };
        UserManager.prototype.getLastProfileChanged = function (uid, callback) {
            this.userDataAccess.getLastProfileChanged(uid, callback);
        };
        UserManager.prototype.updateImageProfile = function (uid, newUrl, callback) {
            this.userDataAccess.updateImageProfile(uid, newUrl, callback);
        };
        UserManager.prototype.getRoomAccessForUser = function (uid, callback) {
            this.userDataAccess.getRoomAccessForUser(uid, callback);
        };
        UserManager.prototype.getRoomAccessOfRoom = function (uid, rid, callback) {
            this.userDataAccess.getRoomAccessOfRoom(uid, rid, callback);
        };
        UserManager.prototype.updateLastAccessTimeOfRoom = function (uid, rid, date, callback) {
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
                },
                function (arg, cb) {
                    if (arg && arg.roomAccess) {
                        self.userDataAccess.findRoomAccessDataMatchWithRoomId(uid, rid, date, cb);
                    }
                    else {
                        //<!-- insert roomAccess info field in user data collection.
                        self.userDataAccess.insertRoomAccessInfoField(uid, rid, cb);
                    }
                }], function (err, result) {
                callback(err, result);
            });
        };
        UserManager.prototype.AddRoomIdToRoomAccessField = function (roomId, memberIds, date, callback) {
            var self = this;
            async.each(memberIds, function (element, cb) {
                var user = new User.User();
                user.id = element;
                self.userDataAccess.AddRidToRoomAccessField(element, roomId, date, function (error, response) {
                    cb();
                });
            }, function (errCb) {
                if (!errCb) {
                    callback(null, true);
                }
            });
        };
        UserManager.prototype.AddRoomIdToRoomAccessFieldForUser = function (roomId, userId, date, callback) {
            this.userDataAccess.AddRidToRoomAccessField(userId, roomId, date, callback);
        };
        UserManager.prototype.updateFavoriteMembers = function (editType, member, uid, callback) {
            if (editType === "add") {
                this.userDataAccess.addFavoriteMembers(member, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeFavoriteMembers(member, uid, callback);
            }
        };
        UserManager.prototype.updateFavoriteGroups = function (editType, group, uid, callback) {
            if (editType === "add") {
                this.userDataAccess.addFavoriteGroup(group, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeFavoriteGroup(group, uid, callback);
            }
        };
        UserManager.prototype.updateClosedNoticeUsersList = function (editType, member, uid, callback) {
            if (editType === "add") {
                this.userDataAccess.addClosedNoticeUsersList(member, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeClosedNoticeUsersList(member, uid, callback);
            }
        };
        UserManager.prototype.updateClosedNoticeGroups = function (editType, group, uid, callback) {
            if (editType === "add") {
                this.userDataAccess.addClosedNoticeGroupList(group, uid, callback);
            }
            else if (editType === "remove") {
                this.userDataAccess.removeClosedNoticeGroupList(group, uid, callback);
            }
        };
        //region <!-- Other user.
        UserManager.prototype.getMemberProfile = function (uid, callback) {
            var query = { _id: new ObjectID(uid) };
            var projection = { roomAccess: 0 };
            this.userDataAccess.getUserProfile(query, projection, callback);
        };
        //endregion
        /**
        * Check creator permission for create ProjectBase Group requesting.
        * res will return { _id, role } of user model.
        */
        UserManager.prototype.getCreatorPermission = function (creator, callback) {
            this.userDataAccess.getRole(creator, function (err, res) {
                //<!-- res will return { _id, role } of user model.
                if (err || res === null) {
                    callback(err, null);
                }
                else {
                    callback(null, res);
                }
            });
        };
        UserManager.prototype.checkUnsubscribeRoom = function (userId, roomType, roomId, callback) {
            if (roomType === Room.RoomType.privateGroup) {
                MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
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
                MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                    if (err) {
                        return console.dir(err);
                    }
                    assert.equal(null, err);
                    // Get the documents collection
                    var user = db.collection(Mdb.DbController.userColl);
                    user.find({ _id: new ObjectID(userId), closedNoticeUsers: roomId }).limit(1).toArray(function (err, docs) {
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
        };
        UserManager._instance = null;
        return UserManager;
    })();
    Controller.UserManager = UserManager;
    var UserDataAccessService = (function () {
        function UserDataAccessService() {
            this.findRoomAccessDataMatchWithRoomId = function (uid, rid, date, callback) {
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
            };
            this.insertRoomAccessInfoField = function (id, rid, callback) {
                var newRoomAccessInfos = new Array();
                newRoomAccessInfos[0] = new RoomAccess.RoomAccessData();
                newRoomAccessInfos[0].roomId = rid;
                newRoomAccessInfos[0].accessTime = new Date();
                DbClient.UpdateDocument(Mdb.DbController.userColl, function (result) {
                    console.log("Upsert roomAccess array field.", result.result);
                    UserManager.getInstance().onInsertRoomAccessInfoDone(id, rid, callback);
                }, { _id: new ObjectID(id) }, { $set: { roomAccess: newRoomAccessInfos } }, { w: 1, upsert: true });
            };
        }
        UserDataAccessService.prototype.getLastProfileChanged = function (uid, callback) {
            DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
                callback(null, result);
            }, { _id: new ObjectID(uid) }, { lastEditProfile: 1 });
        };
        UserDataAccessService.prototype.getRoomAccessForUser = function (uid, callback) {
            DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
                callback(null, result);
            }, { _id: new ObjectID(uid) }, { roomAccess: 1 });
        };
        UserDataAccessService.prototype.AddRidToRoomAccessField = function (uid, roomId, date, callback) {
            var self = this;
            DbClient.FindDocument(Mdb.DbController.userColl, function (res) {
                if (!res.roomAccess) {
                    self.InsertMembersFieldsToUserModel(uid, roomId, date, callback);
                }
                else {
                    //<!-- add rid to MembersFields.
                    self.findRoomAccessDataMatchWithRoomId(uid, roomId, date, function (err, res) {
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
        };
        UserDataAccessService.prototype.InsertMembersFieldsToUserModel = function (uid, roomId, date, callback) {
            var newRoomAccessInfos = new Array();
            newRoomAccessInfos[0] = new RoomAccess.RoomAccessData();
            newRoomAccessInfos[0].roomId = roomId;
            newRoomAccessInfos[0].accessTime = date;
            DbClient.UpdateDocument(Mdb.DbController.userColl, function (res) {
                console.log("InsertMembersFieldsToUserModel: ", res.result);
                if (callback !== null)
                    callback(null, res);
            }, { _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } });
        };
        UserDataAccessService.prototype.updateImageProfile = function (uid, newUrl, callback) {
            DbClient.UpdateDocument(Mdb.DbController.userColl, function (res) {
                callback(null, res);
            }, { _id: new ObjectID(uid) }, { $set: { image: newUrl, lastEditProfile: new Date() } }, { w: 1, upsert: true });
        };
        UserDataAccessService.prototype.getRoomAccessOfRoom = function (uid, rid, callback) {
            console.log("getRoomAccess for room %s of user %s", rid, uid);
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid } }, _id: 0 }).limit(1).toArray(function (err, docs) {
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
        };
        UserDataAccessService.prototype.getUserProfile = function (query, projection, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find(query).project(projection).limit(1).toArray(function (err, results) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        callback(null, results);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.getRole = function (creator, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find({ _id: new ObjectID(creator) }).project({ role: 1 }).limit(1).toArray(function (err, results) {
                    if (err || results === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, results);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.addFavoriteMembers = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteUsers: member } }, { upsert: true }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.removeFavoriteMembers = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteUsers: member } }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.addFavoriteGroup = function (group, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteGroups: group } }, { upsert: true }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.removeFavoriteGroup = function (group, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteGroups: group } }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.addClosedNoticeUsersList = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeUsers: member } }, { upsert: true }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.removeClosedNoticeUsersList = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeUsers: member } }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.addClosedNoticeGroupList = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeGroups: member } }, { upsert: true }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        UserDataAccessService.prototype.removeClosedNoticeGroupList = function (member, uid, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeGroups: member } }, function (err, result) {
                    if (err || result === null) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        };
        return UserDataAccessService;
    })();
    Controller.UserDataAccessService = UserDataAccessService;
})(Controller = exports.Controller || (exports.Controller = {}));
