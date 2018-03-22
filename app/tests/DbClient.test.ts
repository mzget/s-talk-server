import { InitDatabaseConnection } from "../DbClient";
import { DBConfig } from "../../config/config";

test('db connection', () => {
    InitDatabaseConnection(DBConfig.database_name).then(db => {
        expect(db.databaseName).toEqual("s-talk");
    }).catch(err => {

    });
});