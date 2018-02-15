const devApi = "http://localhost:9000";
const dev2Api = "http://203.150.95.146:9000";
const masterApi = "http://203.148.250.152:3002";

interface IStalkHookApi {
  apikey: string;
  onPushByUids: string;
}
const hooks = new Map<string, IStalkHookApi>();
hooks.set("alcohol1234", {
  apikey: "alcohol1234",
  onPushByUids: "https://chitchats.ga:8999/api/message/pushByUids",
});
hooks.set("survey1234", {
  apikey: "survey1234",
  onPushByUids: "http://chitchats.ga:8998/api/message/pushByUids",
});
hooks.set("jc212224", {
  apikey: "jc212224",
  onPushByUids: "http://119.59.110.214:9000/api/message/pushByUids",
});
const getHookApi = (appKey: string) => {
  return hooks.get(appKey);
};

const devConfig = {
  apiKeys: ["chitchat1234", "alcohol1234", "survey1234", "ooca1234", "jc212224"],
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
};

function getConfig() {
  // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
  // console.log(process.env.NODE_ENV, conf.chatDB);

  return devConfig;
}

export function getWebhook(appKey: string = "alcohol1234") {
  const webhook = getHookApi(appKey);
  return webhook;
}

export const Config = getConfig();
