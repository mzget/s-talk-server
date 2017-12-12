"use strict";
const Mdb = require("../db/dbClient");
const room = require("../model/Room");
const mongodb = require("mongodb");
const assert = require("assert");
var MongoClient = mongodb.MongoClient;
var DbClient = Mdb.DbController.DbClient.GetInstance();
var Controller;
(function (Controller) {
    class CompanyManager {
        constructor() {
            this.dataAccessService = new MemberDataAccessService();
            if (CompanyManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            CompanyManager._instance = this;
        }
        static getInstance() {
            if (CompanyManager._instance === null) {
                CompanyManager._instance = new CompanyManager();
            }
            return CompanyManager._instance;
        }
        GetCompany(callback) {
            DbClient.FindDocument(Mdb.DbController.companyColl, callback, {}, { _id: 0 });
        }
        getMyOrganizeChatRooms(userId, callback) {
            DbClient.FindDocuments(Mdb.DbController.roomColl, (result) => {
                callback(null, result);
            }, { type: room.RoomType.organizationGroup, status: room.RoomStatus.active, members: { $elemMatch: { id: userId } } });
        }
        GetCompanyMembers(projection, callback) {
            this.dataAccessService.getFirstQueryMembers(projection, callback);
        }
    }
    CompanyManager._instance = null;
    Controller.CompanyManager = CompanyManager;
    class MemberDataAccessService {
        constructor() { }
        getFirstQueryMembers(projection, callback) {
            MongoClient.connect(Mdb.DbController.chatDB, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find({}).project(projection).toArray(function (err, result) {
                    assert.equal(null, err);
                    if (err) {
                        callback(new Error("find members is no response."), err);
                    }
                    else {
                        callback(null, result);
                    }
                    db.close();
                });
            });
        }
    }
})(Controller || (Controller = {}));
module.exports = Controller;
