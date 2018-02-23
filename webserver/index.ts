import * as express from "express";

import { DefaultRouter } from "./routes";
import { UsersRouter } from "./routes/users";

function createWebServer(pomeloServer: any) {
    const app = express();

    app.use((req, res, next) => {
        req["pomelo"] = pomeloServer;
        next();
    });
    app.use(DefaultRouter);
    app.use(UsersRouter);
    app.listen(3003, () => console.log("Web Server listening on port 3003!"));
}

export default createWebServer;
