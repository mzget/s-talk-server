var generic = require('../util/collections');
;
var OnlineUser = (function () {
    function OnlineUser() {
    }
    return OnlineUser;
})();
exports.OnlineUser = OnlineUser;
;
var UserTransaction = (function () {
    function UserTransaction() {
    }
    return UserTransaction;
})();
exports.UserTransaction = UserTransaction;
;
var User = (function () {
    function User() {
    }
    User.prototype.toString = function () {
        return generic.collections.makeString(this);
    };
    return User;
})();
exports.User = User;
;
//# sourceMappingURL=User.js.map