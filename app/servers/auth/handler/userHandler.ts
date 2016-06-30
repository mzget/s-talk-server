/**********************************************
* User Handler;
* for edit user profile info.
***********************************************/

import Mdb = require('../../../db/dbClient');
import code = require('../../../../shared/Code');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import Room = require('../../../model/Room');
import async = require('async');
import { AccountService } from '../../../services/accountService';
import FriendManager from "../../../controller/friendManager";

const dbClient = Mdb.DbController.DbClient.GetInstance();
const ObjectID = require('mongodb').ObjectID;
const webConfig = require('../../../../config/webConfig.json');
var channelService;
var chatService : AccountService;

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

    let id = setTimeout(function () {
        next(null, { code: code.RequestTimeout, message: "request timeout..." });
    }, webConfig.timeout);

    let friendManager = new FriendManager();
    friendManager.addFriends(myUid, targetUid, (err, res) => {
        if (err) {
            let log = 'add friend: fail!' + err;

            clearTimeout(id);
            next(null, { code: code.FAIL, message: log });
        }
        else {
            clearTimeout(id);
            next(null, { code: code.OK, message: res });

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
}