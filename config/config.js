"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database = require("./database.json");
const devApi = "http://localhost:9000";
const dev2Api = "http://203.150.95.146:9000";
const masterApi = "http://203.148.250.152:3002";
const hooks = new Map();
hooks.set("alcohol1234", {
    appname: "tas",
    appId: "",
    apikey: "alcohol1234",
    onPushByUids: "https://chitchats.ga:8999/api/message/pushByUids",
});
hooks.set("survey1234", {
    appname: "survey",
    appId: "",
    apikey: "survey1234",
    onPushByUids: "http://chitchats.ga:8998/api/message/pushByUids",
});
hooks.set("jccommerce", {
    appname: "jc",
    appId: "jccommerce",
    apikey: "jc212224",
    onPushByUids: "http://119.59.110.214:9000/api/message/pushByUids",
});
hooks.set("chitchat", {
    appname: "chitchat",
    appId: "chitchat",
    apikey: "chitchat1234",
    onPushByUids: "http://chitchats.ga:9000/api/message/pushByUids",
});
hooks.set("ooca", {
    appname: "ooca",
    appId: "ooca",
    apikey: "ooca1234",
    onPushByUids: "",
});
hooks.set("ooca-dev", {
    appname: "ooca-dev",
    appId: "ooca-dev",
    apikey: "ooca1234",
    onPushByUids: "",
});
const getHookApi = (appKey) => {
    return hooks.get(appKey);
};
const devConfig = {
    appIds: ["chitchat1234", "alcohol1234", "survey1234", "ooca", "ooca-dev", "jc212224"],
    api: {
        apikey: "chitchat1234",
        host: `${dev2Api}`,
        authen: `${dev2Api}/api/authenticate/verify`,
        chatroom: `${dev2Api}/api/chatroom`,
        chat: `${dev2Api}/api/stalk/chat`,
        user: `${dev2Api}/api/stalk/user`,
    },
    timeout: 10000,
    pushServer: "smelink.animation-genius.com",
    ParseApplicationId: "newSMELink",
    ParseRESTAPIKey: "link1234",
    ParseMasterKey: "link1234",
    pushPort: 4040,
    pushPath: "/parse/push",
    session: {
        expire: "1 days",
        secret: "ahoostudio_session_secret",
    },
    redis_port: 6379,
    redis_host: "chitchats.ga",
};
function getConfig() {
    // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
    // console.log(process.env.NODE_ENV, conf.chatDB);
    return devConfig;
}
function getWebhook(appKey = "alcohol1234") {
    const webhook = getHookApi(appKey);
    return webhook;
}
exports.getWebhook = getWebhook;
function appInfo(appId) {
    return hooks.get(appId);
}
exports.appInfo = appInfo;
exports.Config = getConfig();
exports.DBConfig = {
    mongo_uri: database.mongo_uri,
    database_name: database.database_name
};
