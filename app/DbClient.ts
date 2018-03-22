import mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
import { Config, DBConfig } from "../config/config";

let appDB = undefined as mongodb.Db | undefined;
export const getAppDb = () => {
    return appDB;
};
export const InitDatabaseConnection = async (dbname: string) => {
    try {
        const opt = {
            reconnectTries: Number.MAX_VALUE,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 60000,
        } as mongodb.MongoClientOptions;
        const client = await MongoClient.connect(DBConfig.mongo_uri, opt);
        appDB = client.db(dbname);

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

