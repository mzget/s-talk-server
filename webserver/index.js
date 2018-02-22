"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
function createWebServer() {
    const expressApp = express();
    expressApp.get("/", (req, res) => res.send("Hello World!"));
    expressApp.listen(3000, () => console.log("Example app listening on port 3000!"));
}
exports.default = createWebServer;
