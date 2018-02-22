import * as express from "express";

import { DefaultRouter } from "./routes";

function createWebServer() {
    const app = express();


    app.use(DefaultRouter);
    app.listen(3000, () => console.log("Web Server listening on port 3000!"));
}

export default createWebServer;
