"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const routes_1 = require("./routes");
function createWebServer(pomeloServer) {
    const app = express();
    app.use((req, res, next) => {
        req["pomelo"] = pomeloServer;
        next();
    });
    app.use(routes_1.DefaultRouter);
    app.listen(3000, () => console.log("Web Server listening on port 3000!"));
}
exports.default = createWebServer;
