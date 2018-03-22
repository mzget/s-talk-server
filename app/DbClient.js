"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const config_1 = require("../config/config");
let appDB = undefined;
exports.getAppDb = () => {
    return appDB;
};
exports.InitDatabaseConnection = (dbname) => __awaiter(this, void 0, void 0, function* () {
    try {
        const opt = {
            reconnectTries: Number.MAX_VALUE,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 60000,
        };
        const client = yield MongoClient.connect(config_1.DBConfig.mongo_uri, opt);
        appDB = client.db(dbname);
        appDB.on("close", (err) => {
            console.error("close", err);
        });
        appDB.on("error", (err) => {
            console.error("error", err);
        });
        appDB.on("timeout", (err) => {
            console.error("timeout", err);
        });
        appDB.on("reconnect", (server) => {
            console.log("reconnect", server);
        });
        return Promise.resolve(appDB);
    }
    catch (ex) {
        console.warn("DB connect", ex);
        return Promise.reject(ex.message);
    }
});
