import mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
import { Config } from "../config/config";

let appDB = null as mongodb.Db;
export const getAppDb = () => {
    console.log(appDB.stats());
    return appDB;
};
export const InitDatabaseConnection = async () => {
    // let opt = { server: { poolSize: 100 } } as mongodb.MongoClientOptions;
    appDB = await MongoClient.connect(Config.chatDB);

    appDB.on("close", function (err: any) {
        console.error("close", err);
    });

    appDB.on("error", function (err: any) {
        console.error("error", err);
    });

    appDB.on("timeout", function (err: any) {
        console.error("timeout", err);
    });

    appDB.on("reconnect", function (server: any) {
        console.log("reconnect", server);
    });

    return appDB;
};

