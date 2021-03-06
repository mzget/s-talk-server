"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DbClient_1 = require("../DbClient");
const config_1 = require("../../config/config");
test('db connection', () => {
    expect.assertions(1);
    return DbClient_1.InitDatabaseConnection(config_1.DBConfig.database_name).then(db => {
        expect(db.databaseName).toEqual("s-talk");
    }).catch(ex => {
        expect(ex).toBeDefined();
    });
});
