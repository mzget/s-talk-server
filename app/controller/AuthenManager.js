var MDbController = require('../db/dbClient');
var DbClient = MDbController.DbController.DbClient.GetInstance();
var Controller;
(function (Controller) {
    var AuthenManager = (function () {
        function AuthenManager() {
            if (AuthenManager._instance) {
                console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
            }
            AuthenManager._instance = this;
        }
        AuthenManager.getInstance = function () {
            if (AuthenManager._instance === null || AuthenManager._instance === undefined) {
                AuthenManager._instance = new AuthenManager();
            }
            return AuthenManager._instance;
        };
        AuthenManager.prototype.GetUsername = function (query, callback, projections) {
            DbClient.FindDocument(MDbController.DbController.userColl, callback, query, projections);
        };
        AuthenManager._instance = null;
        return AuthenManager;
    })();
    Controller.AuthenManager = AuthenManager;
})(Controller = exports.Controller || (exports.Controller = {}));
//# sourceMappingURL=AuthenManager.js.map