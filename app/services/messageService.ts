
import request = require("request");

import { Config } from "../../config/config";
import { Message } from "../model/Message";

export async function saveMessage(_message: Message) {
    let p = await new Promise((resolve: (message: Message) => void, rejected) => {
        let options = {
            url: `${Config.api.chat}/send`,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`
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
}