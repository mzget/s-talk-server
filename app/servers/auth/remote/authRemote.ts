/// <reference path="../../../../typings/tsd.d.ts" />

import jwt = require('jsonwebtoken');
import Code = require('../../../../shared/Code');
import TokenService = require('../../../services/tokenService');
import MAuthen = require('../../../controller/AuthenManager');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import { Room } from "../../../model/Room";
import Generic = require('../../../util/collections');
import code = require('../../../../shared/Code');
import { AccountService } from '../../../services/accountService';
import Mcontroller = require('../../../controller/ChatRoomManager');
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();

const userManager = MUser.Controller.UserManager.getInstance();
const authenManager = MAuthen.Controller.AuthenManager.getInstance();
const tokenService: TokenService = new TokenService();
var accountService: AccountService;
var channelService;

module.exports = function (app) {
    return new AuthenRemote(app);
}

const AuthenRemote = function (app) {
    this.app = app;

    channelService = app.get("channelService");
    if (app.getServerType() === 'auth') {
        accountService = app.get('accountService');
        initServer();
    }
}

const remote = AuthenRemote.prototype;

/**
 * Init Server this function call when server start.
 * for load room members from database to cache in memmory before.
 */
const initServer = function (): void {
    chatRoomManager.getAllRooms(function (rooms) {
        //<!-- To reduce database retrive data. We store rooms Map data to server memory.
        console.log("init AuthenServer for get all rooms data to server memory.");

        accountService.setRoomsMap(rooms, () => { });
    });
}

/**
 * UpdateOnlineUsers.
 * The func call with 2 scenario,
 * 1. Call when user login success and joining in system.
 * 2. call when user logout.
 */
remote.addOnlineUser = function (user, cb) {
    console.error("addOnlineUser");
    accountService.addOnlineUser(user, cb);
}
remote.removeOnlineUser = function (userId, cb) {
    accountService.removeOnlineUser(userId);
    cb();
}
remote.getOnlineUser = function (userId: string, callback: (err, user: User.OnlineUser) => void) {
    accountService.getOnlineUser(userId, callback);
}
remote.getOnlineUsers = function (callback: (err, user: User.IOnlineUser) => void) {
    callback(null, accountService.OnlineUsers);
}

remote.addUserTransaction = function (userTransac: User.UserTransaction, cb) {
    if (accountService.userTransaction !== null) {
        if (!accountService.userTransaction[userTransac.uid]) {
            accountService.userTransaction[userTransac.uid] = userTransac;
        }
    }
    else {
        console.warn("chatService.userTransaction is null.");
    }

    cb();
}
remote.getUserTransaction = function (uid: string, cb: Function) {
    if (!!accountService.userTransaction) {
        cb(null, accountService.userTransaction[uid]);
    }
    else {
        cb(null, null);
    }
}


remote.getRoomMap = function (rid: string, callback: (err, res) => void) {
    accountService.getRoom(rid, callback);
}

remote.updateRoomMembers = function (data, cb) {
    accountService.addRoom(data);

    if (!!cb) {
        cb();
    }
}
/**
* UpdateRoomsMap When New Room Has Create Then Push New Room To All Members.
*/
remote.updateRoomsMapWhenNewRoomCreated = function (rooms: Array<Room>, cb: Function) {
    rooms.forEach(room => {
        if (!accountService.RoomsMap[room._id]) {
            accountService.addRoom(room);

            //<!-- Notice all member of new room to know they have a new room.   
            let param = {
                route: Code.sharedEvents.onNewGroupCreated,
                data: room
            }

            let pushGroup = new Array();
            room.members.forEach(member => {
                accountService.getOnlineUser(member.id, (err, user) => {
                    if (!err) {
                        var item = { uid: user.uid, sid: user.serverId };
                        pushGroup.push(item);
                    }
                });
            });

            channelService.pushMessageByUids(param.route, param.data, pushGroup);
        }
    });

    cb();
}

remote.checkedCanAccessRoom = function (roomId: string, userId: string, callback: (err: Error, res: boolean) => void) {
    accountService.getRoom(roomId, (err, room) => {
        let result: boolean = false;

        if (err || !room) {
            callback(null, result);
        }
        else {
            result = room.members.some(value => {
                if (value.id === userId) {
                    return true;
                }
            });

            callback(null, result);
        }
    });
}


remote.tokenService = function (bearerToken: string, cb: Function) {
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
}

remote.myProfile = function (userId: string, cb: Function) {
    userManager.getMemberProfile(userId, (err, res) => {
        if (res === null) {
            var errMsg = "Get my user data is invalid.";
            console.error(errMsg);
            cb({ code: Code.FAIL, message: errMsg });
            return;
        }

        cb({ code: Code.OK, data: res });
    });
}


remote.auth = function (email, password, callback) {
    authenManager.GetUsername({ username: email }, function (res) {
        onAuthentication(password, res, callback);
    }, { username: 1, password: 1 });
}

const onAuthentication = function (_password, userInfo, callback) {
    console.log("onAuthentication: ", userInfo);

    if (userInfo !== null) {
        let obj = JSON.parse(JSON.stringify(userInfo));

        if (obj.password === _password) {
            accountService.getOnlineUser(obj._id, (error, user) => {
                if (!user) {
                    // if user is found and password is right
                    // create a token
                    let token = tokenService.signToken(obj);
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