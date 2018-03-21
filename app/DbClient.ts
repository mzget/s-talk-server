import mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
import { Config } from "../config/config";

let appDB = undefined as any;
export const getAppDb = () => {
    return appDB;
};
export const InitDatabaseConnection = async () => {
    try {
        const opt = {
            reconnectTries: Number.MAX_VALUE,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 60000,
        } as mongodb.MongoClientOptions;
        appDB = await MongoClient.connect(Config, opt);

        appDB.on("close", (err: any) => {
            console.error("close", err);
        });

        appDB.on("error", (err: any) => {
            console.error("error", err);
        });

        appDB.on("timeout", (err: any) => {
            console.error("timeout", err);
        });

        appDB.on("reconnect", (server: any) => {
            console.log("reconnect", server);
        });

        return Promise.resolve(appDB);
    } catch (ex) {
        console.warn("DB connect", ex);
        return Promise.reject(ex.message);
    }
};

