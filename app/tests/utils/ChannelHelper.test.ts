import { UserSession } from "../../model/User";
import { getUsersGroup, withoutUser } from "../../util/ChannelHelper";

test('test getUserGroup from empty array.', () => {
    expect(getUsersGroup([])).toEqual([]);
});


test('test getUserGroup from valid array.', () => {
    expect(getUsersGroup([{ uid: "1", serverId: "1", username: "test" }] as UserSession[]))
        .toEqual([{ uid: "1", sid: "1" }]);
});



test('test withoutUser from usersGroups array.', () => {
    expect(withoutUser([{ uid: "1", sid: "1" }], "1"))
        .toEqual([]);
});