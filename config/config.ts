let devApi = "http://smelink.animation-genius.com";
let masterApi = "http://matchlink.asia";

const devConfig = {
  api: {
    apikey: "smelink-chat1234",
    authen: `${devApi}:3002/api/authenticate/verify`,
    user: `${devApi}:3002/users/query`,
    chatroom: `${devApi}:3003/api/chatroom`
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
    apikey: "smelink-chat1234",
    authen: `${masterApi}:3002/api/authenticate/verify`,
    user: `${masterApi}:3002/users/query`,
    chatroom: `${masterApi}:3003/api/chatroom`
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
  let conf = (process.env.NODE_ENV === `production`) ? masterConfig : devConfig;
  console.log(process.env.NODE_ENV, conf.chatDB);

  return conf;
}

export const Config = getConfig();