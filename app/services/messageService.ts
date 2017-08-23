
import request = require("request");
import * as rp from "request-promise-native";

import { Config } from "../../config/config";
import { Message } from "../model/Message";

export async function pushByUids(_message: Message) {
    let p = await new Promise((resolve: (message: Message) => void, rejected) => {
        let options = {
            url: `${Config.stalkHook.onPushByUids}`,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.stalkHook.apikey}`
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

        request.post(options, callback);
    });

    return p;
}

export async function chat(_message: Message, room: string) {
    try {
        let options = {
            url: `${Config.api.chat}/chat`,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`
            },
            body: JSON.stringify({
                message: _message,
                room: room
            })
        };

        let data = await rp.post(options);

        return data.result as Message;
    } catch (ex) {
        throw new Error(ex.message);
    }
}