import { InitDatabaseConnection } from "../DbClient";
import { DBConfig } from "../../config/config";

test('db connection', () => {
    expect.assertions(1);
    return InitDatabaseConnection(DBConfig.database_name).then(db => {
        expect(db.databaseName).toEqual("s-talk");
    });
});
