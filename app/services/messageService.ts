
import * as fetch from "isomorphic-fetch";

import { Config, getWebhook } from "../../config/config";
import { Message } from "../model/Message";

export async function pushByUids(message: Message, appKey: string) {
    const webhook = getWebhook(appKey);
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

            const response = await fetch(url, options);
            const data = await response.json();
            return data.result;
        } catch (ex) {
            return Promise.reject(ex.message);
        }
    }
    else {
        console.error("No webhook provided");
    }
}

export async function chat(message: Message, room: string) {
    try {
        const url = `${Config.api.chat}/chat`;
        const options = {
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`,
            },
            body: JSON.stringify({
                message,
                room,
            }),
        };

        const response = await fetch(url, options);
        const data = await response.json();
        return data.result as Message;
    } catch (ex) {
        return Promise.reject(ex.message);
    }
}
