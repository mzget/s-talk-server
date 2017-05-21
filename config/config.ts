let devApi = "http://localhost:9000";
let dev2Api = "http://203.150.95.146:9000";
let masterApi = "http://203.148.250.152:3002";

const devConfig = {
  apiKey: "chitchat1234",
  api: {
    apikey: "chitchat1234",
    host: `${dev2Api}`,
    authen: `${dev2Api}/api/authenticate/verify`,
    chatroom: `${dev2Api}/api/chatroom`,
    chat: `${dev2Api}/api/stalk/chat`
  },
  chatDB: "mongodb://rfl_dev:rfl1234@git.animation-genius.com:27017/chitchat-dev",
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

const masterConfig = {
  apiKey: "chitchat1234",
  api: {
    authen: `${masterApi}/api/authenticate/verify`
  },
  chatDB: "mongodb://chats:chats1234@smelink.animation-genius.com:27017/chats",
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

function getConfig() {
  // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
  // console.log(process.env.NODE_ENV, conf.chatDB);

  return devConfig;
}

export const Config = getConfig();