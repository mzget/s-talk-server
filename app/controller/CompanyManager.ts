import Mdb = require('../db/dbClient');
import room = require('../model/Room');
import mongodb = require('mongodb');
import assert = require('assert');
var MongoClient = mongodb.MongoClient;
var DbClient = Mdb.DbController.DbClient.GetInstance();

module Controller {
    export class CompanyManager {
        private static _instance: CompanyManager = null;
        public static getInstance(): CompanyManager {
            if (CompanyManager._instance === null) {
                CompanyManager._instance = new CompanyManager();
            }
            return CompanyManager._instance;
        }

        private dataAccessService: MemberDataAccessService = new MemberDataAccessService();

        constructor() {
            if (CompanyManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            CompanyManager._instance = this;
        }

        public GetCompany(callback) {
            DbClient.FindDocument(Mdb.DbController.companyColl, callback, {}, { _id: 0 });
        }

        public getMyOrganizeChatRooms(userId: string, callback: (err, res) => void) {
            DbClient.FindDocuments(Mdb.DbController.roomColl, (result) => {
                callback(null, result);
            }, { type: room.RoomType.organizationGroup, status: room.RoomStatus.active, members: { $elemMatch: { id: userId } } });
        }

        GetCompanyMembers(projection: any, callback: (err, res) => void) {
            this.dataAccessService.getFirstQueryMembers(projection, callback);
        }
    }

    class MemberDataAccessService {
        constructor() { }

        public getFirstQueryMembers(projection: any, callback: (err, res) => void): void {
            MongoClient.connect(Mdb.DbController.chatDB, function (err, db) {
                if (err) { return console.dir(err); }
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
}
export = Controller;