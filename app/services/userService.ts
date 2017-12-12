import request = require("request");
import * as rp from 'request-promise-native';

import { Config } from "../../config/config";

export async function getDeviceTokens(members_id: Array<string>) {
    try {
        let options = {
            url: `${Config.api.user}/deviceTokens`,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`
            },
            body: JSON.stringify({
                members_id: members_id
            })
        };

        let body = await rp.get(options);
        let data = JSON.parse(body);

        return data.result;
    }
    catch (ex) {
        console.warn(`problem with request: ${ex.message}`);
        throw new Error(ex.message);
    }
}