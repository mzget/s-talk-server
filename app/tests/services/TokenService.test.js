"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokenService_1 = require("../../services/tokenService");
const tokenService = new tokenService_1.default();
test('test signToken with undefine', (done) => {
    tokenService.signToken(undefined, (err, result) => {
        expect(err).toBeInstanceOf(Error);
        done();
    });
});
test('test signToken with data', (done) => {
    tokenService.signToken({ username: "test", id: "1x24x" }, (err, result) => {
        expect(result).toBeDefined();
        done();
    });
});
