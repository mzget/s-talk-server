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
const request = require("request");
const config_1 = require("../../config/config");
function getRoom(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const p = yield new Promise((resolve, rejected) => {
            const options = {
                url: `${config_1.Config.api.chatroom}?room_id=${roomId}`,
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`,
                },
            };
            function callback(error, response, body) {
                if (error) {
                    console.log(`problem with request: ${error}`);
                    rejected(error);
                }
                else if (!error && response.statusCode === 200) {
                    const data = JSON.parse(body);
                    if (data.result && data.result.length > 0) {
                        resolve(data.result[0]);
                    }
                    else {
                        rejected(data);
                    }
                }
                else {
                    console.log("getUserInfo: ", response.statusCode, response.statusMessage);
                    rejected(response);
                }
            }
            request.get(options, callback);
        });
        return p;
    });
}
exports.getRoom = getRoom;
function checkedCanAccessRoom(room, userId, callback) {
    let result = false;
    result = room.members.some((value, id, arr) => value._id === userId);
    callback(undefined, result);
}
exports.checkedCanAccessRoom = checkedCanAccessRoom;
