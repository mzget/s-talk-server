const config = {
    api: {
        authen: "http://git.animation-genius.com:3005/api/authenticate/verify"
    },
    chatDB: "mongodb://git.animation-genius.com:27017/smelink-chat",
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
    return config;
}

export const Config = getConfig();