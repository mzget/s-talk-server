/// <reference path="../../../../typings/tsd.d.ts" />
"use strict";
var Code = require('../../../../shared/Code');
var TokenService = require('../../../services/tokenService');
var MAuthen = require('../../../controller/AuthenManager');
var MUser = require('../../../controller/UserManager');
var Mcontroller = require('../../../controller/ChatRoomManager');
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var userManager = MUser.Controller.UserManager.getInstance();
var authenManager = MAuthen.Controller.AuthenManager.getInstance();
var tokenService = new TokenService();
var accountService;
var channelService;
module.exports = function (app) {
    return new AuthenRemote(app);
};
var AuthenRemote = function (app) {
    this.app = app;
    channelService = app.get("channelService");
    if (app.getServerType() === 'auth') {
        accountService = app.get('accountService');
        initServer();
    }
};
var remote = AuthenRemote.prototype;
/**
 * Init Server this function call when server start.
 * for load room members from database to cache in memmory before.
 */
var initServer = function () {
    chatRoomManager.getAllRooms(function (rooms) {
        //<!-- To reduce database retrive data. We store rooms Map data to server memory.
        console.log("init AuthenServer for get all rooms data to server memory.");
        accountService.setRoomsMap(rooms, function () { });
    });
};
/**
 * UpdateOnlineUsers.
 * The func call with 2 scenario,
 * 1. Call when user login success and joining in system.
 * 2. call when user logout.
 */
remote.addOnlineUser = function (user, cb) {
    console.error("addOnlineUser");
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
remote.updateRoomMembers = function (data, cb) {
    accountService.addRoom(data);
    if (!!cb) {
        cb();
    }
};
/**
* UpdateRoomsMap When New Room Has Create Then Push New Room To All Members.
*/
remote.updateRoomsMapWhenNewRoomCreated = function (rooms, cb) {
    rooms.forEach(function (room) {
        if (!accountService.RoomsMap[room._id]) {
            accountService.addRoom(room);
            //<!-- Notice all member of new room to know they have a new room.   
            var param = {
                route: Code.sharedEvents.onNewGroupCreated,
                data: room
            };
            var pushGroup_1 = new Array();
            room.members.forEach(function (member) {
                accountService.getOnlineUser(member.id, function (err, user) {
                    if (!err) {
                        var item = { uid: user.uid, sid: user.serverId };
                        pushGroup_1.push(item);
                    }
                });
            });
            channelService.pushMessageByUids(param.route, param.data, pushGroup_1);
        }
    });
    cb();
};
remote.getAccountService = function () {
    return accountService;
};
remote.checkedCanAccessRoom = function (roomId, userId, callback) {
    accountService.getRoom(roomId, function (err, room) {
        var result = false;
        if (err || !room) {
            callback(null, result);
        }
        else {
            result = room.members.some(function (value) {
                if (value.id === userId) {
                    return true;
                }
            });
            callback(null, result);
        }
    });
};
remote.tokenService = function (bearerToken, cb) {
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
remote.me = function (msg, cb) {
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
remote.auth = function (email, password, callback) {
    authenManager.GetUsername({ username: email }, function (res) {
        onAuthentication(password, res, callback);
    }, { username: 1, password: 1 });
};
var onAuthentication = function (_password, userInfo, callback) {
    console.log("onAuthentication: ", userInfo);
    if (userInfo !== null) {
        var obj_1 = JSON.parse(JSON.stringify(userInfo));
        if (obj_1.password === _password) {
            accountService.getOnlineUser(obj_1._id, function (error, user) {
                if (!user) {
                    // if user is found and password is right
                    // create a token
                    var token = tokenService.signToken(obj_1);
                    callback({
                        code: Code.OK,
                        uid: obj_1._id,
                        message: "Authenticate success!",
                        token: token
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
            });
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
