import * as fetch from "isomorphic-fetch";

import { Config } from "../../config/config";
import { Room, RoomStatus, RoomType } from "../model/Room";

export async function getRoom(roomId: string) {
    try {
        const url = `${Config.api.chatroom}?room_id=${roomId}`;
        const options = {
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-cache",
                "x-api-key": `${Config.api.apikey}`,
            },
        };

        const response = await fetch(url, options);
        const data = await response.json();
        if (data.result && data.result.length > 0) {
            return data.result[0];
        }
        else {
            return Promise.reject(data);
        }
    } catch (ex) {
        return Promise.reject(ex.message);
    }
}

export function checkedCanAccessRoom(room: Room, userId: string, callback: (err: Error | undefined, res: boolean) => void) {
    let result = false;

    result = room.members.some((value, id, arr) => value._id === userId);

    callback(undefined, result);
}
