"use strict";
var Mcontroller = require("../../../controller/ChatRoomManager");
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var channelService;
module.exports = function (app) {
    return new ChatRoomRemote(app);
};
var ChatRoomRemote = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};
var remote = ChatRoomRemote.prototype;
remote.checkedRoomType = function (roomId, cb) {
    chatRoomManager.GetChatRoomInfo(roomId, { type: 1 }).then(function (result) {
        cb(null, result);
    }).catch(function (err) {
        var errMsg = "checkedRoomType fail.";
        console.error(errMsg);
        cb(errMsg, null);
    });
};
