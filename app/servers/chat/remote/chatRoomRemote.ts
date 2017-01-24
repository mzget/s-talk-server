import Mcontroller = require('../../../controller/ChatRoomManager');
import Room = require('../../../model/Room');
import mongodb = require('mongodb');
import ObjectID = mongodb.ObjectID;
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var channelService;

module.exports = function (app) {
    return new ChatRoomRemote(app);
};

const ChatRoomRemote = function (app) {
    this.app = app;

    channelService = app.get('channelService');
}

const remote = ChatRoomRemote.prototype;

remote.checkedRoomType = function (roomId: string, cb: (err, res) => void) {
    chatRoomManager.GetChatRoomInfo(roomId, { type: 1 }).then(result => {
        cb(null, result);
    }).catch(err => {
        var errMsg = "checkedRoomType fail.";
        console.error(errMsg);
        cb(errMsg, null);
    });
}