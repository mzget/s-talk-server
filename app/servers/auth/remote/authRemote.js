"use strict";
var Code = require('../../../../shared/Code');
var TokenService = require('../../../services/tokenService');
var MAuthen = require('../../../controller/AuthenManager');
var MUser = require('../../../controller/UserManager');
var userManager = MUser.Controller.UserManager.getInstance();
var authenManager = MAuthen.Controller.AuthenManager.getInstance();
var tokenService = new TokenService();
var onlineUserCollection;
module.exports = function (app) {
    return new AuthenRemote(app);
};
var AuthenRemote = function (app) {
    this.app = app;
};
var authenRemote = AuthenRemote.prototype;
authenRemote.tokenService = function (bearerToken, cb) {
    tokenService.ensureAuthorized(bearerToken, function (err, res) {
        if (err) {
            console.info("ensureAuthorized error: ", err);
            cb(err, { code: Code.FAIL, message: err });
        }
        else {
            cb(null, { code: Code.OK, decoded: res.decoded });
        }
    });
};
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
    }, { roomAccess: 0 });
};
authenRemote.auth = function (email, password, onlineUsers, callback) {
    onlineUserCollection = onlineUsers;
    authenManager.GetUsername({ email: email }, function (res) {
        onAuthentication(password, res, callback);
    }, { email: 1, password: 1 });
};
var onAuthentication = function (_password, userInfo, callback) {
    console.log("onAuthentication: ", userInfo);
    if (userInfo !== null) {
        var obj_1 = JSON.parse(JSON.stringify(userInfo));
        if (obj_1.password === _password) {
            var user = onlineUserCollection[obj_1._id];
            if (!user) {
                // if user is found and password is right
                // create a token
                tokenService.signToken(obj_1, function (err, encode) {
                    if (err) {
                        callback({
                            code: Code.FAIL,
                            uid: obj_1._id,
                            message: err,
                        });
                    }
                    else {
                        callback({
                            code: Code.OK,
                            uid: obj_1._id,
                            message: "Authenticate success!",
                            token: encode
                        });
                    }
                });
            }
            else {
                console.warn("Duplicate user by onlineUsers collections.");
                callback({
                    code: Code.DuplicatedLogin,
                    message: "duplicate log in.",
                    uid: obj_1._id,
                });
            }
        }
        else {
            callback({
                code: Code.FAIL,
                message: "Authentication failed."
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
