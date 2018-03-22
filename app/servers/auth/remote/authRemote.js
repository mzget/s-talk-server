"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userNotFound = "Authentication failed. User not found.";
module.exports = function (app) {
    return new AuthenRemote(app);
};
class AuthenRemote {
    constructor(app) {
        this.app = app;
        this.channelService = app.get("channelService");
        this.accountService = app.get("accountService");
    }
}
