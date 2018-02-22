import mongodb = require("mongodb");
import Code from "../../../../shared/Code";

import { UserDataAccessService } from "../../../controller/UserManager";
import User, { UserSession, IOnlineUser, UserTransaction } from "../../../model/User";
import { Room } from "../../../model/Room";
import IChannelService, { IUserGroup } from "../../../util/ChannelService";
import { AccountService } from "../../../services/accountService";
import * as chatroomService from "../../../services/chatroomService";
import Mcontroller = require("../../../controller/ChatRoomManager");
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
let accountService: AccountService;
let channelService: IChannelService;

const userNotFound = "Authentication failed. User not found.";

module.exports = function (app) {
    return new RemoteAuthen(app);
};

/**
 * Init Server this function call when server start.
 * for load room members from database to cache in memmory before.
 */
const initServer = () => {
    // <!-- To reduce database retrive data. We store rooms Map data to server memory.
    console.log("init AuthenServer.");
};

export interface IRemoteServer {
    addOnlineUser;
    removeOnlineUser;
    updateUser;
    getOnlineUser;
    getOnlineUserByAppId;
    getOnlineUsers;
    addUserTransaction;
    getUserTransaction;
}


class RemoteAuthen implements IRemoteServer {
    app: any;

    constructor(app) {
        this.app = app;

        channelService = app.get("channelService");
        if (app.getServerType() === "auth") {
            accountService = app.get("accountService");
            initServer();
        }
    }
    /**
     * UpdateOnlineUsers.
     * The func call with 2 scenario,
     * 1. Call when user login success and joining in system.
     * 2. call when user logout.
     */
    addOnlineUser(user: UserSession, cb) {
        accountService.addOnlineUser(user, cb);
    }

    removeOnlineUser(userId: string, cb) {
        accountService.removeOnlineUser(userId);
        cb();
    }

    updateUser(user: UserSession, cb: (err, data) => void) {
        accountService.updateUser(user)
            .then((value) => cb(undefined, value))
            .catch((error) => cb(error, undefined));
    }

    getOnlineUser(userId: string, callback: (err: Error, user: UserSession | null) => void) {
        accountService.getOnlineUser(userId, callback);
    }

    getOnlineUserByAppId(appId: string, callback: (err: Error, users: UserSession[] | null) => void) {
        accountService.getOnlineUserByAppId(appId, callback);
    };
    getOnlineUsers(callback: (err, user) => void) {
        callback(null, accountService.OnlineUsers);
    }

    addUserTransaction(userTransac: UserTransaction, cb) {
        if (accountService.userTransaction !== null) {
            if (!accountService.userTransaction[userTransac.uid]) {
                accountService.userTransaction[userTransac.uid] = userTransac;
            }
        } else {
            console.warn("chatService.userTransaction is null.");
        }

        cb();
    };

    getUserTransaction(uid: string, cb: (err, data) => void) {
        if (!!accountService.userTransaction) {
            cb(null, accountService.userTransaction[uid]);
        } else {
            cb(new Error("No have userTransaction"), null);
        }
    };
}