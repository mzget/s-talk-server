"use strict";
const Code_1 = require("../../../../shared/Code");
const tokenService_1 = require("../../../services/tokenService");
const UserManager_1 = require("../../../controller/UserManager");
const Mcontroller = require("../../../controller/ChatRoomManager");
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
const tokenService = new tokenService_1.default();
let accountService;
let channelService;
const userNotFound = "Authentication failed. User not found.";
module.exports = function (app) {
    return new AuthenRemote(app);
};
const AuthenRemote = function (app) {
    this.app = app;
    channelService = app.get("channelService");
    if (app.getServerType() === 'auth') {
        accountService = app.get('accountService');
        initServer();
    }
};
const remote = AuthenRemote.prototype;
/**
 * Init Server this function call when server start.
 * for load room members from database to cache in memmory before.
 */
const initServer = function () {
    //<!-- To reduce database retrive data. We store rooms Map data to server memory.
    console.log("init AuthenServer.");
};
/**
 * UpdateOnlineUsers.
 * The func call with 2 scenario,
 * 1. Call when user login success and joining in system.
 * 2. call when user logout.
 */
remote.addOnlineUser = function (user, cb) {
    accountService.addOnlineUser(user, cb);
};
remote.removeOnlineUser = function (userId, cb) {
    accountService.removeOnlineUser(userId);
    cb();
};
remote.getOnlineUser = function (userId, callback) {
    accountService.getOnlineUser(userId, callback);
};
remote.getOnlineUsers = function (callback) {
    callback(null, accountService.OnlineUsers);
};
remote.addUserTransaction = function (userTransac, cb) {
    if (accountService.userTransaction !== null) {
        if (!accountService.userTransaction[userTransac.uid]) {
            accountService.userTransaction[userTransac.uid] = userTransac;
        }
    }
    else {
        console.warn("chatService.userTransaction is null.");
    }
    cb();
};
remote.getUserTransaction = function (uid, cb) {
    if (!!accountService.userTransaction) {
        cb(null, accountService.userTransaction[uid]);
    }
    else {
        cb(new Error("No have userTransaction"), null);
    }
};
remote.tokenService = function (bearerToken, cb) {
    tokenService.ensureAuthorized(bearerToken, function (err, res) {
        if (err) {
            console.warn("ensureAuthorized error: ", err);
            cb(err, { code: Code_1.default.FAIL, message: err });
        }
        else {
            cb(null, { code: Code_1.default.OK, decoded: res.decoded });
        }
    });
};
remote.auth = function (email, password, callback) {
    let query = { email: email };
    let projection = { email: 1, password: 1 };
    new UserManager_1.UserDataAccessService().getUserProfile(query, projection, (err, res) => {
        if (!err && res.length > 0) {
            onAuthentication(password, res[0], callback);
        }
        else {
            callback(userNotFound, null);
        }
    });
};
const onAuthentication = function (_password, userInfo, callback) {
    console.log("onAuthentication: ", userInfo);
    if (userInfo !== null) {
        let obj = JSON.parse(JSON.stringify(userInfo));
        if (obj.password === _password) {
            accountService.getOnlineUser(obj._id, (error, user) => {
                if (!user) {
                    // if user is found and password is right
                    // create a token
                    tokenService.signToken(obj, (err, encode) => {
                        callback({
                            code: Code_1.default.OK,
                            uid: obj._id,
                            token: encode
                        });
                    });
                }
                else {
                    console.warn("Duplicate user by onlineUsers collections.");
                    callback({
                        code: Code_1.default.DuplicatedLogin,
                        message: "duplicate log in.",
                        uid: obj._id,
                    });
                }
            });
        }
        else {
            callback({
                code: Code_1.default.FAIL,
                message: "Authentication failed. User not found."
            });
        }
    }
    else {
        callback({
            code: Code_1.default.FAIL,
            message: "Authentication failed. User not found."
        });
    }
};
