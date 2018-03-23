"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokenService_1 = require("../../services/tokenService");
const tokenService = new tokenService_1.default();
// test('test signToken undefine', () => {
//     tokenService.signToken(undefined, (err, result) => {
//         expect(err).toBeInstanceOf(Error);
//     });
// });
test('test signToken with data', () => {
    tokenService.signToken({ username: "test", id: "1x24x" }, (err, result) => {
        console.log(result);
        expect(result).toBe("");
    });
});
