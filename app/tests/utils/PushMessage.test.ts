import { pushMessage, IPushMessage } from "../../utils/PushMessage";

const message = { event: "test", message: "message", members: "*" } as IPushMessage;

test('test pushMessage function', () => {
    expect(pushMessage(undefined, undefined, message)).toBeInstanceOf(Function);
});