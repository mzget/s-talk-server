"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const routes_1 = require("./routes");
function createWebServer() {
    const app = express();
    app.use(routes_1.DefaultRouter);
    app.listen(3000, () => console.log("Web Server listening on port 3000!"));
}
exports.default = createWebServer;
