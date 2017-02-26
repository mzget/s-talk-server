"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let devApi = "http://git.animation-genius.com:9000";
let masterApi = "http://203.148.250.152:3002";
const devConfig = {
    api: {
        authen: `${devApi}/api/authenticate/verify`
    },
    chatDB: "mongodb://rfl_dev:rfl1234@git.animation-genius.com:27017/chitchat-dev",
    fileDB: "",
    timeout: 10000,
    pushServer: "smelink.animation-genius.com",
    ParseApplicationId: "newSMELink",
    ParseRESTAPIKey: "link1234",
    ParseMasterKey: "link1234",
    pushPort: 4040,
    pushPath: "/parse/push",
    session: {
        expire: "1 days",
        secret: "ahoostudio_session_secret"
    },
    redis_port: 6379,
    redis_host: "smelink.animation-genius.com"
};
const masterConfig = {
    api: {
        authen: `${masterApi}/api/authenticate/verify`
    },
    chatDB: "mongodb://chats:chats1234@smelink.animation-genius.com:27017/chats",
    fileDB: "",
    port: 80,
    timeout: 10000,
    webserver: "http://git.animation-genius.com",
    pushServer: "smelink.animation-genius.com",
    ParseApplicationId: "newSMELink",
    ParseRESTAPIKey: "link1234",
    ParseMasterKey: "link1234",
    pushPort: 4040,
    pushPath: "/parse/push",
    session: {
        expire: "1 days",
        secret: "ahoostudio_session_secret"
    },
    redis_port: 6379,
    redis_host: "smelink.animation-genius.com"
};
function getConfig() {
    // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
    // console.log(process.env.NODE_ENV, conf.chatDB);
    return devConfig;
}
exports.Config = getConfig();
