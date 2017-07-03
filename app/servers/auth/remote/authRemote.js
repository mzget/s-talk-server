"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mcontroller = require("../../../controller/ChatRoomManager");
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
let accountService;
let channelService;
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
const initServer = function () {
    // <!-- To reduce database retrive data. We store rooms Map data to server memory.
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
