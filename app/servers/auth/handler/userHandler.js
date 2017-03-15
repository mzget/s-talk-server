/**********************************************
* User Handler;
* for edit user profile info.
***********************************************/
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Mdb = require("../../../db/dbClient");
var Code_1 = require("../../../../shared/Code");
var friendManager_1 = require("../../../../smelinkApp/appLayer/friendManager");
var dbClient = Mdb.DbController.DbClient.GetInstance();
var ObjectID = require('mongodb').ObjectID;
var config_1 = require("../../../../config/config");
var channelService;
var chatService;
module.exports = function (app) {
    console.info("instanctiate userHandler.");
    return new UserHandler(app);
};
var UserHandler = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};
var handler = UserHandler.prototype;
/**
 * Add Friend Request.
 * @targetUid
 * @myUid
 */
handler.addFriend = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    var targetUid = msg.targetUid;
    var myUid = session.uid;
    if (!targetUid || !myUid || !token) {
        var _errMsg = "addFriend: missing params.";
        next(null, { code: Code_1.default.FAIL, message: _errMsg });
        return;
    }
    var id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "request timeout..." });
    }, config_1.Config.timeout);
    var friendManager = new friendManager_1.default();
    friendManager.addFriends(myUid, targetUid, function (err, res) {
        if (err) {
            var log = 'add friend: fail!' + err;
            clearTimeout(id);
            next(null, { code: Code_1.default.FAIL, message: log });
        }
        else {
            clearTimeout(id);
            next(null, { code: Code_1.default.OK, message: res });
            //@ Push a link_request_list to target user.
            var param = {
                route: Code_1.default.friendEvents.addFriendEvent,
                data: res
            };
            var pushGroup_1 = new Array();
            self.app.rpc.chat.chatRemote.getOnlineUser(session, targetUid, function (err, user) {
                if (!err) {
                    var item = { uid: user.uid, sid: user.serverId };
                    pushGroup_1.push(item);
                    channelService.pushMessageByUids(param.route, param.data, pushGroup_1);
                }
            });
        }
    });
};
