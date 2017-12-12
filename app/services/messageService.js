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
const rp = require("request-promise-native");
const config_1 = require("../../config/config");
function pushByUids(_message, appKey) {
    return __awaiter(this, void 0, void 0, function* () {
        let webhook = config_1.getWebhook(appKey);
        let p = yield new Promise((resolve, rejected) => {
            let options = {
                url: `${webhook.onPushByUids}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${webhook.apikey}`
                },
                body: JSON.stringify({
                    message: _message
                })
            };
            function callback(error, response, body) {
                if (error) {
                    console.warn(`problem with request: ${error}`, response);
                    rejected(error);
                }
                else if (!error && response.statusCode == 200) {
                    let data = JSON.parse(body);
                    if (data.result) {
                        resolve(data.result);
                    }
                    else {
                        rejected(data);
                    }
                }
                else {
                    console.warn("saveMessage: ", response.statusCode, response.statusMessage);
                    rejected(response);
                }
            }
            request(options, callback);
        });
        return p;
    });
}
exports.pushByUids = pushByUids;
function chat(_message, room) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let options = {
                url: `${config_1.Config.api.chat}/chat`,
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`
                },
                body: JSON.stringify({
                    message: _message,
                    room: room
                })
            };
            let data = yield rp.post(options);
            return data.result;
        }
        catch (ex) {
            throw new Error(ex.message);
        }
    });
}
exports.chat = chat;
