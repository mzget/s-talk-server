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
    return new AuthenRemote(app);
};

const AuthenRemote = function (app) {
    this.app = app;

    channelService = app.get("channelService");
    if (app.getServerType() === "auth") {
        accountService = app.get("accountService");
        initServer();
    }
};

const remote = AuthenRemote.prototype;

/**
 * Init Server this function call when server start.
 * for load room members from database to cache in memmory before.
 */
const initServer = () => {
    // <!-- To reduce database retrive data. We store rooms Map data to server memory.
    console.log("init AuthenServer.");
};
