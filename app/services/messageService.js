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
function pushByUids(message, appKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const webhook = config_1.getWebhook(appKey);
        console.log("getWebhook", appKey, webhook);
        if (webhook) {
            try {
                const url = `${webhook.onPushByUids}`;
                const options = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "cache-control": "no-cache",
                        "x-api-key": `${webhook.apikey}`,
                    },
                    body: JSON.stringify({
                        message,
                    }),
                };
                console.log("options", url, options);
                const response = yield fetch(url, options);
                const data = yield response.json();
                console.log("JSON", data);
                return data.result;
            }
            catch (ex) {
                return Promise.reject(ex);
            }
        }
        else {
            console.error("No webhook provided");
        }
    });
}
exports.pushByUids = pushByUids;
function chat(message, room) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `${config_1.Config.api.chat}/chat`;
            const options = {
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`,
                },
                body: JSON.stringify({
                    message,
                    room,
                }),
            };
            const response = yield fetch(url, options);
            const data = yield response.json();
            return data.result;
        }
        catch (ex) {
            return Promise.reject(ex.message);
        }
    });
}
exports.chat = chat;
