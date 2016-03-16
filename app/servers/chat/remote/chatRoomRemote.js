/// <reference path="../../../../typings/tsd.d.ts" />
"use strict";
var Mcontroller = require('../../../controller/ChatRoomManager');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var chatService;
var channelService;
module.exports = function (app) {
    return new ChatRoomRemote(app);
};
var ChatRoomRemote = function (app) {
    this.app = app;
    if (app.getServerType() === 'chat') {
        channelService = app.get('channelService');
        chatService = app.get('chatService');
    }
};
var remote = ChatRoomRemote.prototype;
remote.checkedRoomType = function (roomId, cb) {
    chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, { type: 1 }, function (result) {
        if (!result) {
            var errMsg = "checkedRoomType fail.";
            console.error(errMsg);
            cb(errMsg, null);
        }
        else {
            cb(null, result);
        }
    });
};
