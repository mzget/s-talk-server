import mongodb = require("mongodb");
import Code from "../../../../shared/Code";

import User, { UserSession, IOnlineUser, UserTransaction } from "../../../model/User";
import { Room } from "../../../model/Room";
import IChannelService, { IUserGroup } from "../../../utils/ChannelService";
import { AccountService } from "../../../services/accountService";
import * as chatroomService from "../../../services/chatroomService";

const userNotFound = "Authentication failed. User not found.";

module.exports = function (app) {
    return new AuthenRemote(app);
};

class AuthenRemote {
    app: any;
    accountService: AccountService;
    channelService: IChannelService;

    constructor(app) {
        this.app = app;

        this.channelService = app.get("channelService");
        this.accountService = app.get("accountService");
    }
}
