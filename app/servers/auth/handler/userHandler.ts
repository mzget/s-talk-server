/**********************************************
* User Handler;
* for edit user profile info.
***********************************************/

/// <reference path="../../../../typings/tsd.d.ts" />

import Mdb = require('../../../db/dbClient');
import code = require('../../../../shared/Code');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import Room = require('../../../model/Room');
import async = require('async');
const dbClient = Mdb.DbController.DbClient.GetInstance();
const ObjectID = require('mongodb').ObjectID;
import MChatService = require('../../../services/chatService');
import FriendManager from "../../../controller/friendManager";
var channelService;
var chatService : MChatService.ChatService;

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
        next(null, { code: code.FAIL, message: _errMsg });
        return;
    }

    let friendManager = new FriendManager();
    friendManager.addFriends(myUid, targetUid, (err, res) => {
        if (err) {
            console.log('add friend: fail!', err);
        }
        else {
            //@ Push a link_request_list to target user.
            var param = {
                route: code.friendEvents.addFriendEvent,
                data: res
            };

            let pushGroup = new Array();            
            self.app.rpc.chat.chatRemote.getOnlineUser(session, targetUid, (err, user: User.OnlineUser) => {
                if (!err) {
                    let item = { uid: user.uid, sid: user.serverId };
                    pushGroup.push(item);

                    channelService.pushMessageByUids(param.route, param.data, pushGroup);
                }
            });
        }
    });

    next(null, { code: code.OK });
}