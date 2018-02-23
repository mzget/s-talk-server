"use strict";
/**
 * Redis client use util.promisify only support in node.js v8
 */
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const { promisify } = require('util');
const config_1 = require("../../config/config");
const RedisClient = redis.createClient(config_1.Config.redis_port, config_1.Config.redis_host, { no_ready_check: true });
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
exports.getAsync = promisify(RedisClient.get).bind(RedisClient);
exports.hgetAsync = promisify(RedisClient.hget).bind(RedisClient);
exports.hmgetAsync = promisify(RedisClient.hmget).bind(RedisClient);
exports.hgetallAsync = promisify(RedisClient.hgetall).bind(RedisClient);
exports.default = RedisClient;
