import * as express from "express";

import { DefaultRouter } from "./routes";

function createWebServer(pomeloServer: any) {
    const app = express();

    app.use((req, res, next) => {
        req["pomelo"] = pomeloServer;
        next();
    });
    app.use(DefaultRouter);
    app.listen(3000, () => console.log("Web Server listening on port 3000!"));
}

export default createWebServer;
