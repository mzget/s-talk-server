let devApi = "smelink.animation-genius.com";
let masterApi = "http://matchlink.asia:3002";

const devConfig = {
  api: {
    host: `${devApi}`,
    port: 3003,
    apikey: "smelink-chat1234",
    authen: `/api/authenticate/verify`,
    chatroom: `/api/chatroom`,
    user: `${devApi}/users/query`
  },
  chatDB: "mongodb://rfl_dev:rfl1234@git.animation-genius.com:27017/smelink-chat-dev",
  fileDB: "",
  timeout: 10000,

  pushServer: "matchlink.asia",
  ParseApplicationId: "matchlink",
  ParseRESTAPIKey: "",
  ParseMasterKey: "link1234",
  pushPort: 4040,
  pushPath: "/parse/push",
  session: {
    expire: "300",
    secret: "ahoostudio_session_secret"
  }
}

const masterConfig = {
  api: {
    host: `${masterApi}`,
    port: 3003,
    apikey: "smelink-chat1234",
    authen: `/api/authenticate/verify`,
    chatroom: `/api/chatroom`,
    user: `${masterApi}/users/query`
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
}

function getConfig() {
  // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
  // console.log(process.env.NODE_ENV, conf.chatDB);

  return devConfig;
}

export const Config = getConfig();