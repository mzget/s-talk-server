"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var devApi = "http://smelink.animation-genius.com:3002";
var masterApi = "http://matchlink.asia:3002";
var config = {
    api: {
        authen: devApi + "/api/authenticate/verify"
    },
    chatDB: "mongodb://git.animation-genius.com:27017/smelink-chat",
    fileDB: "",
    port: 80,
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
    }
};
var masterConfig = {
    api: {
        authen: masterApi + "/api/authenticate/verify"
    },
    chatDB: "mongodb://smelink:arrapwd#2017@203.148.255.26:27017/Chat",
    fileDB: "",
    port: 80,
    timeout: 10000,
    pushServer: "matchlink.asia",
    ParseApplicationId: "matchlink",
    ParseRESTAPIKey: "",
    ParseMasterKey: "link1234",
    pushPort: 4040,
    pushPath: "/parse/push",
    session: {
        expire: "1 days",
        secret: "ahoostudio_session_secret"
    }
};
function getConfig() {
    // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
    // console.log(process.env.NODE_ENV, conf.chatDB);
    return masterConfig;
}
exports.Config = getConfig();
