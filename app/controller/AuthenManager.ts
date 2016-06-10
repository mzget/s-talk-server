import MDbController = require('../db/dbClient');
var DbClient = MDbController.DbController.DbClient.GetInstance();


export module Controller {
    export class AuthenManager {
        private static _instance: AuthenManager = null;
        public static getInstance(): AuthenManager {
            if (AuthenManager._instance === null || AuthenManager._instance === undefined) {
                AuthenManager._instance = new AuthenManager();
            }
            return AuthenManager._instance;
        }

        constructor() {
            if (AuthenManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            AuthenManager._instance = this;
        }

        GetUsername(query, callback, projections?) {
            DbClient.FindDocument(MDbController.DbController.userColl, callback, query, projections);
        }
    }
}