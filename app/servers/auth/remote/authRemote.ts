/// <reference path="../../../../typings/jsonwebtoken/jsonwebtoken.d.ts" />
import jwt = require('jsonwebtoken');
import Code = require('../../../../shared/Code');
import TokenService = require('../../../services/tokenService');
import MAuthen = require('../../../controller/AuthenManager');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import Generic = require('../../../util/collections');
import code = require('../../../../shared/Code');
import ChatService = require('../../../services/chatService');

var userManager = MUser.Controller.UserManager.getInstance();
var authenManager = MAuthen.Controller.AuthenManager.getInstance();
var tokenService: TokenService = new TokenService();
var onlineUserCollection: User.OnlineUser;

module.exports = function (app) {
    return new AuthenRemote(app);
}

var AuthenRemote = function (app) {
    this.app = app;
}

var authenRemote = AuthenRemote.prototype;

authenRemote.tokenService = function (bearerToken: string, cb: Function)
{
    tokenService.ensureAuthorized(bearerToken, function (err, res) {
        if (err) {
            console.info("ensureAuthorized error: ", err);
            cb(err, { code: Code.FAIL, message: err });
        }
        else {
            cb(null, { code: Code.OK, decoded: res.decoded });
        }
    });
}

/**
 * route for /me data.
 * require => username, password, bearerToken
 */
authenRemote.me = function (msg, cb) {
    var username = msg.username;
    var password = msg.password;
    var bearerToken = msg.token;

    authenManager.GetUsername({ username: username.toLowerCase() }, function (user) {
        if (user === null) {
            var errMsg = "Get my user data is invalid.";
            console.error(errMsg);
            cb({ code: Code.FAIL, message: errMsg });
            return;
        }

        cb({ code: Code.OK, data: user });
    }, {roomAccess : 0 });
}

authenRemote.auth = function (username, password, onlineUsers, callback) {
    onlineUserCollection = onlineUsers;
    authenManager.GetUsername({ username: username }, function (res) {
        onAuthentication(password, res, callback);
    }, { username: 1, password: 1 });
}

var onAuthentication = function (_password, userInfo, callback) {
    console.log("onAuthentication: ", userInfo);
    if (userInfo !== null) {
        var obj = JSON.parse(JSON.stringify(userInfo));

        if (obj.password === _password) {
            var user = onlineUserCollection[obj._id];
            if (!user) {
                // if user is found and password is right
                // create a token
                var token = tokenService.signToken(obj);
                callback({
                    code: Code.OK,
                    uid: obj._id,
                    message: "Authenticate success!",
                    token: token
                });
            }
            else {
                console.warn("Duplicate user by onlineUsers collections.");
                callback({
                    code: Code.DuplicatedLogin,
                    message: "duplicate log in.",
                    uid: obj._id,
                });
            }
        }
        else {
            callback({
                code: Code.FAIL,
                message: "Authentication failed. User not found."
            });
        }
    }
    else {
        callback({
            code: Code.FAIL,
            message: "Authentication failed. User not found."
        });
    }
};