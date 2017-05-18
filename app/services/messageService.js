"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const request = require("request");
const config_1 = require("../../config/config");
function saveMessage(_message) {
    return __awaiter(this, void 0, void 0, function* () {
        let p = yield new Promise((resolve, rejected) => {
            let options = {
                url: `${config_1.Config.api.chat}/send`,
                headers: {
                    "Content-Type": "application/json",
                    "cache-control": "no-cache",
                    "x-api-key": `${config_1.Config.api.apikey}`
                },
                body: JSON.stringify({
                    message: _message
                })
            };
            function callback(error, response, body) {
                if (error) {
                    console.warn(`problem with request: ${error}`);
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
            request.post(options, callback);
        });
        return p;
    });
}
exports.saveMessage = saveMessage;
