"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const bluebird = require("bluebird");
const config_1 = require("../../config/config");
const redisClient = redis.createClient(config_1.Config.redis_port, config_1.Config.redis_host, { no_ready_check: true });
redisClient.on("connect", function () {
    console.log("redis connected");
});
redisClient.on("ready", function () {
    console.log("redis ready ");
});
redisClient.on("error", function (err) {
    console.error("redis Error " + err);
});
bluebird.promisifyAll(redisClient);
// bluebird.promisifyAll(redis.Multi.prototype);
exports.default = redisClient;
exports.ROOM_KEY = "rooms";
exports.ROOM_MAP_KEY = "room_map";
