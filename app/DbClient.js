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
let appDB = null;
exports.getAppDb = () => {
    return appDB;
};
exports.InitDatabaseConnection = () => __awaiter(this, void 0, void 0, function* () {
    // let opt = { server: { poolSize: 100 } } as mongodb.MongoClientOptions;
    appDB = yield MongoClient.connect(config_1.Config.chatDB);
    appDB.on("close", function (err) {
        console.error("close", err);
    });
    appDB.on("error", function (err) {
        console.error("error", err);
    });
    appDB.on("timeout", function (err) {
        console.error("timeout", err);
    });
    appDB.on("reconnect", function (server) {
        console.log("reconnect", server);
    });
    return appDB;
});
