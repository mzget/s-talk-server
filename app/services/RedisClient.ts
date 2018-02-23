/**
 * Redis client use util.promisify only support in node.js v8
 */

import redis = require("redis");
const { promisify } = require('util');

import { Config } from "../../config/config";

const RedisClient = redis.createClient(Config.redis_port, Config.redis_host, { no_ready_check: true });
RedisClient.on("connect", function () {
    console.log("redis connected");
});
RedisClient.on("ready", function () {
    console.log("redis ready ");
});
RedisClient.on("error", function (err) {
    console.error("redis Error " + err);
});

// bluebird.promisifyAll(RedisClient);
// bluebird.promisifyAll(redis.Multi.prototype);

export const getAsync = promisify(RedisClient.get).bind(RedisClient);

export default RedisClient;