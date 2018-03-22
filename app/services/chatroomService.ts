
import request = require("request");

import { Config } from "../../config/config";
import { Room, RoomStatus, RoomType } from "../model/Room";

export async function getRoom(roomId: string) {
    const p = await new Promise((resolve: (room: Room) => void, rejected) => {
        const options = {
            url: `${Config.api.chatroom}?room_id=${roomId}`,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`,
            },
        };

        function callback(error, response, body) {
            if (error) {
                console.log(`problem with request: ${error}`);
                rejected(error);
            } else if (!error && response.statusCode === 200) {
                const data = JSON.parse(body);
                if (data.result && data.result.length > 0) {
                    resolve(data.result[0]);
                } else {
                    rejected(data);
                }
            } else {
                console.log("getUserInfo: ", response.statusCode, response.statusMessage);
                rejected(response);
            }
        }

        request.get(options, callback);
    });

    return p;
}

export function checkedCanAccessRoom(room: Room, userId: string, callback: (err: Error | undefined, res: boolean) => void) {
    let result = false;

    result = room.members.some((value, id, arr) => value._id === userId);

    callback(undefined, result);
}
