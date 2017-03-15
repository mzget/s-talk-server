"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async = require("async");
var Code_1 = require("../../../../shared/Code");
var config_1 = require("../../../../config/config");
var channelService;
module.exports = function (app) {
    return new Handler(app);
};
var Handler = function (app) {
    console.info("pushHandler construc...");
    this.app = app;
    channelService = this.app.get('channelService');
};
var handler = Handler.prototype;
handler.push = function (msg, session, next) {
    var self = this;
    var timeout_id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "Push message timeout..." });
    }, config_1.Config.timeout);
    //<!-- send callback to user who send chat msg.
    var sessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
    var params = {
        session: sessionInfo
    };
    next(null, { code: Code_1.default.OK, data: params });
    clearTimeout(timeout_id);
    pushMessage(self.app, session, msg);
};
function pushMessage(app, session, body) {
    var onlineMembers = new Array();
    var offlineMembers = new Array();
    //@ Try to push message to others.
    if (body.members == "*") {
        var onPush = {
            route: Code_1.default.sharedEvents.ON_PUSH,
            data: { event: body.event, message: body.message }
        };
        channelService.broadcast("connector", onPush.route, onPush.data);
    }
    else if (body.members instanceof Array) {
        async.map(body.members, function (item, resultCallback) {
            app.rpc.auth.authRemote.getOnlineUser(session, item, function (err, user) {
                if (err || user === null) {
                    offlineMembers.push(item);
                }
                else {
                    onlineMembers.push(user);
                }
                resultCallback(null, item);
            });
        }, function (err, results) {
            console.log("online %s: offline %s: push.members %s:", onlineMembers.length, offlineMembers.length, body.members.length);
            //<!-- push chat data to other members in room.
            var onPush = {
                route: Code_1.default.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };
            //<!-- Push new message to online users.
            var uidsGroup = new Array();
            async.map(onlineMembers, function iterator(val, cb) {
                var group = {
                    uid: val.uid,
                    sid: val.serverId
                };
                uidsGroup.push(group);
                cb(null, null);
            }, function done() {
                channelService.pushMessageByUids(onPush.route, onPush.data, uidsGroup);
                //<!-- Push message to off line users via parse.
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        });
    }
}
