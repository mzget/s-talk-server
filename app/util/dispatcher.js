"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crc = require('crc');
var dispatch = function (uid, connectors) {
    var index = Math.abs(crc.crc32(uid)) % connectors.length;
    return connectors[index];
};
exports.default = dispatch;
