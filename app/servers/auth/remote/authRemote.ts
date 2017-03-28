import mongodb = require("mongodb");
import Code from '../../../../shared/Code';
import TokenService from '../../../services/tokenService';

import { UserDataAccessService } from '../../../controller/UserManager';
import User = require('../../../model/User');
import { Room } from "../../../model/Room";
import { AccountService } from '../../../services/accountService';
import * as chatroomService from '../../../services/chatroomService';
import Mcontroller = require('../../../controller/ChatRoomManager');
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
const tokenService: TokenService = new TokenService();
let accountService: AccountService;
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
const initServer = function (): void {
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
remote.getOnlineUser = function (userId: string, callback: (err, user: User.OnlineUser) => void) {
    accountService.getOnlineUser(userId, callback);
};
remote.getOnlineUsers = function (callback: (err, user: User.IOnlineUser) => void) {
    callback(null, accountService.OnlineUsers);
};

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
};

remote.getUserTransaction = function (uid: string, cb: Function) {
    if (!!accountService.userTransaction) {
        cb(null, accountService.userTransaction[uid]);
    }
    else {
        cb(new Error("No have userTransaction"), null);
    }
};

remote.tokenService = function (bearerToken: string, cb: (err: any, res: any) => void) {
    tokenService.ensureAuthorized(bearerToken, function (err, res) {
        if (err) {
            console.warn("ensureAuthorized error: ", err);
            cb(err, { code: Code.FAIL, message: err });
        }
        else {
            cb(null, { code: Code.OK, decoded: res.decoded });
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
                            code: Code.OK,
                            uid: obj._id,
                            token: encode
                        });
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