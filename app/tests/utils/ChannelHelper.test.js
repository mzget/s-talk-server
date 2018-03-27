"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ChannelHelper_1 = require("../../utils/ChannelHelper");
test('test getUserGroup from empty array.', () => {
    expect(ChannelHelper_1.getUsersGroup([])).toEqual([]);
});
test('test getUserGroup from valid array.', () => {
    expect(ChannelHelper_1.getUsersGroup([{ uid: "1", serverId: "1", username: "test" }]))
        .toEqual([{ uid: "1", sid: "1" }]);
});
test('test withoutUser from usersGroups array.', () => {
    expect(ChannelHelper_1.withoutUser([{ uid: "1", sid: "1" }], "1"))
        .toEqual([]);
});
