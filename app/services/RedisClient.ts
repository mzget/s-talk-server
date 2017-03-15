import redis = require("redis");
import bluebird = require("bluebird");
import { Config } from "../../config/config";

const redisClient = redis.createClient(Config.redis_port, Config.redis_host, { no_ready_check: true });
redisClient.on("connect", function () {
    console.log("redis connected");
});
redisClient.on("ready", function () {
    console.log("redis ready ");
});
redisClient.on("error", function (err: any) {
    console.error("redis Error " + err);
});

bluebird.promisifyAll(redisClient);
// bluebird.promisifyAll(redis.Multi.prototype);


export default redisClient;

export const ROOM_KEY = "rooms";
export const ROOM_MAP_KEY = "room_map";