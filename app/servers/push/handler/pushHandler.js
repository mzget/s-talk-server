"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const ChannelHelper_1 = require("../../../util/ChannelHelper");
const Code_1 = require("../../../../shared/Code");
const Const_1 = require("../../../Const");
const config_1 = require("../../../../config/config");
const ValidationSchema_1 = require("../../../utils/ValidationSchema");
const Joi = require("joi");
let channelService;
let accountService;
module.exports = function (app) {
    return new PushHandler(app);
};
class PushHandler {
    constructor(app) {
        console.info("pushHandler construc...");
        this.app = app;
        channelService = this.app.get("channelService");
        accountService = this.app.get("accountService");
    }
    push(msg, session, next) {
        let self = this;
        let schema = ValidationSchema_1.default({
            payload: Joi.object({
                event: Joi.string().required(),
                message: Joi.string().required(),
                members: Joi.any(),
            }).required(),
        });
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        let timeout_id = setTimeout(function () {
            next(null, { code: Code_1.default.RequestTimeout, message: "Push message timeout..." });
        }, config_1.Config.timeout);
        // <!-- send callback to user who send push msg.
        let sessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
        let params = {
            session: sessionInfo
        };
        next(null, { code: Code_1.default.OK, data: params });
        clearTimeout(timeout_id);
        pushMessage(self.app, session, msg.payload);
    }
}
function pushMessage(app, session, body) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    // @ Try to push message to others.
    if (body.members == "*") {
        let param = {
            route: Code_1.default.sharedEvents.ON_PUSH,
            data: { event: body.event, message: body.message }
        };
        accountService.getOnlineUserByAppId(session.get(Const_1.X_APP_ID)).then((userSessions) => {
            console.log("online by app-id", userSessions.length);
            let uids = ChannelHelper_1.getUsersGroup(userSessions);
            channelService.pushMessageByUids(param.route, param.data, uids);
        }).catch(console.warn);
        // channelService.broadcast("connector", onPush.route, onPush.data);
    }
    else if (body.members instanceof Array) {
        async.map(body.members, (item, resultCallback) => {
            accountService.getOnlineUser(item).then((user) => {
                onlineMembers.push(user);
                resultCallback(undefined, item);
            }).catch(err => {
                offlineMembers.push(item);
                resultCallback(undefined, item);
            });
        }, (err, results) => {
            console.log("online %s: offline %s: push.members %s:", onlineMembers.length, offlineMembers.length, body.members.length);
            // <!-- push chat data to other members in room.
            let onPush = {
                route: Code_1.default.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };
            // <!-- Push new message to online users.
            let uidsGroup = new Array();
            async.map(onlineMembers, function iterator(val, cb) {
                let group = {
                    uid: val.uid,
                    sid: val.serverId
                };
                uidsGroup.push(group);
                cb(undefined, undefined);
            }, function done() {
                channelService.pushMessageByUids(onPush.route, onPush.data, uidsGroup);
                // <!-- Push message to off line users via parse.
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        });
    }
}
