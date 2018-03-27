"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const Code_1 = require("../../shared/Code");
const Const_1 = require("../Const");
const ChannelHelper_1 = require("../utils/ChannelHelper");
function pushMessage(app, session, body) {
    return (accountService) => __awaiter(this, void 0, void 0, function* () {
        // @ Try to push message to others.
        if (body.members == "*") {
            let param = {
                route: Code_1.default.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };
            let userSessions = yield accountService.getOnlineUserByAppId(session.get(Const_1.X_APP_ID));
            let uids = ChannelHelper_1.getUsersGroup(userSessions);
            return { param, uids };
            // channelService.broadcast("connector", onPush.route, onPush.data);
        }
        else if (body.members instanceof Array) {
            const waitForMembers = new Promise((resolve, reject) => {
                let onlineMembers = new Array();
                let offlineMembers = new Array();
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
                    resolve({ onlines: onlineMembers, offlines: offlineMembers });
                });
            });
            const { onlines, offlines } = yield waitForMembers;
            // <!-- push chat data to other members in room.
            let param = {
                route: Code_1.default.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };
            // <!-- Push new message to online users.
            let uids = onlines.map(val => {
                return { uid: val.uid, sid: val.serverId };
            });
            // <!-- Push message to off line users via push-notification.
            if (!!offlines && offlines.length > 0) {
                // simplePushNotification(app, session, offlineMembers, room, message.sender);
                console.warn("offline user need for push-notification implementation.", offlines);
            }
            return { param, uids };
        }
    });
}
exports.pushMessage = pushMessage;
