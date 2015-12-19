/// <reference path="../../typings/mongodb/mongodb.d.ts" />
var Mdb = require('../db/dbClient');
var room = require('../model/Room');
var mongodb = require('mongodb');
var assert = require('assert');
var MongoClient = mongodb.MongoClient;
var Cursor = mongodb.Cursor;
var DbClient = Mdb.DbController.DbClient.GetInstance();
var Controller;
(function (Controller) {
    var CompanyManager = (function () {
        function CompanyManager() {
            this.dataAccessService = new MemberDataAccessService();
            if (CompanyManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            CompanyManager._instance = this;
        }
        CompanyManager.getInstance = function () {
            if (CompanyManager._instance === null) {
                CompanyManager._instance = new CompanyManager();
            }
            return CompanyManager._instance;
        };
        CompanyManager.prototype.GetCompany = function (callback) {
            DbClient.FindDocument(Mdb.DbController.companyColl, callback, {}, { _id: 0 });
        };
        CompanyManager.prototype.getMyOrganizeChatRooms = function (userId, callback) {
            DbClient.FindDocuments(Mdb.DbController.roomColl, function (result) {
                callback(null, result);
            }, { type: room.RoomType.organizationGroup, status: room.RoomStatus.active, members: { $elemMatch: { id: userId } } });
        };
        CompanyManager.prototype.GetCompanyMembers = function (projection, callback) {
            this.dataAccessService.getFirstQueryMembers(projection, callback);
        };
        CompanyManager._instance = null;
        return CompanyManager;
    })();
    Controller.CompanyManager = CompanyManager;
    var MemberDataAccessService = (function () {
        function MemberDataAccessService() {
        }
        MemberDataAccessService.prototype.getFirstQueryMembers = function (projection, callback) {
            MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
                if (err) {
                    return console.dir(err);
                }
                assert.equal(null, err);
                // Get the documents collection
                var collection = db.collection(Mdb.DbController.userColl);
                // Find some documents
                collection.find({}, projection).toArray(function (err, result) {
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
        };
        return MemberDataAccessService;
    })();
})(Controller || (Controller = {}));
module.exports = Controller;
//# sourceMappingURL=CompanyManager.js.map