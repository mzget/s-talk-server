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
const fetch = require("isomorphic-fetch");
const config_1 = require("../../config/config");
function getRoom(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `${config_1.Config.api.chatroom}?room_id=${roomId}`;
            const options = {
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`,
                },
            };
            const response = yield fetch(url, options);
            const data = yield response.json();
            if (data.result && data.result.length > 0) {
                return data.result[0];
            }
            else {
                return Promise.reject(data);
            }
        }
        catch (ex) {
            return Promise.reject(ex.message);
        }
    });
}
exports.getRoom = getRoom;
function checkedCanAccessRoom(room, userId, callback) {
    let result = false;
    result = room.members.some((value, id, arr) => value._id === userId);
    callback(undefined, result);
}
exports.checkedCanAccessRoom = checkedCanAccessRoom;
