"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PushMessage_1 = require("../../utils/PushMessage");
const message = { event: "test", message: "message", members: "*" };
test('test pushMessage function', () => {
    expect(PushMessage_1.pushMessage(undefined, undefined, message)).toBeInstanceOf(Function);
});
