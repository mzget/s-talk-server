let devApi = "smelink.animation-genius.com";
let masterApi = "http://203.148.250.152:3002";

const devConfig = {
  api: {
    host: `${devApi}`,
    port: 9000,
    apikey: "smelink-chat1234",
    authen: `/api/authenticate/verify`,
    chatroom: `/api/chatroom`
  },
  chatDB: "mongodb://rfl_dev:rfl1234@git.animation-genius.com:27017/smelink-chat-dev",
  fileDB: "",
  timeout: 10000,

  pushServer: "smelink.animation-genius.com",
  ParseApplicationId: "newSMELink",
  ParseRESTAPIKey: "link1234",
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
  }
}

function getConfig() {
  // let conf = (process.env.NODE_ENV === `production`) ? masterConfig : config;
  // console.log(process.env.NODE_ENV, conf.chatDB);

  return devConfig;
}

export const Config = getConfig();