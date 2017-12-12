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
const rp = require("request-promise-native");
const config_1 = require("../../config/config");
function getDeviceTokens(members_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let options = {
                url: `${config_1.Config.api.user}/deviceTokens`,
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`
                },
                body: JSON.stringify({
                    members_id: members_id
                })
            };
            let body = yield rp.get(options);
            let data = JSON.parse(body);
            return data.result;
        }
        catch (ex) {
            console.warn(`problem with request: ${ex.message}`);
            throw new Error(ex.message);
        }
    });
}
exports.getDeviceTokens = getDeviceTokens;
