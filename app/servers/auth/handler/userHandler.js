/**********************************************
* User Handler;
* for edit user profile info.
***********************************************/
"use strict";
const Mdb = require('../../../db/dbClient');
const Code_1 = require('../../../../shared/Code');
const friendManager_1 = require("../../../../smelinkApp/appLayer/friendManager");
const dbClient = Mdb.DbController.DbClient.GetInstance();
const ObjectID = require('mongodb').ObjectID;
const config_1 = require('../../../../config/config');
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
    let self = this;
    let token = msg.token;
    let targetUid = msg.targetUid;
    let myUid = session.uid;
    if (!targetUid || !myUid || !token) {
        let _errMsg = "addFriend: missing params.";
        next(null, { code: Code_1.default.FAIL, message: _errMsg });
        return;
    }
    let id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "request timeout..." });
    }, config_1.Config.timeout);
    let friendManager = new friendManager_1.default();
    friendManager.addFriends(myUid, targetUid, (err, res) => {
        if (err) {
            let log = 'add friend: fail!' + err;
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
            let pushGroup = new Array();
            self.app.rpc.chat.chatRemote.getOnlineUser(session, targetUid, (err, user) => {
                if (!err) {
                    let item = { uid: user.uid, sid: user.serverId };
                    pushGroup.push(item);
                    channelService.pushMessageByUids(param.route, param.data, pushGroup);
                }
            });
        }
    });
};
