/// <reference path="../../../../typings/tsd.d.ts" />

import MChatService = require('../../../services/chatService');
import Mcontroller = require('../../../controller/ChatRoomManager');
import Room = require('../../../model/Room');
import mongodb = require('mongodb');
import ObjectID = mongodb.ObjectID;
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var chatService: MChatService.ChatService;
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
}

var remote = ChatRoomRemote.prototype;

remote.checkedRoomType = function (roomId: string, cb: (err, res) => void) {
    chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, { type: 1 }, (result) => {
        if (!result) {
            var errMsg = "checkedRoomType fail.";
            console.error(errMsg);
            cb(errMsg, null);
        }
        else {
            cb(null, result);
        }
    });
}