"use strict";
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Text"] = 0] = "Text";
    MessageType[MessageType["Image"] = 1] = "Image";
    MessageType[MessageType["Video"] = 2] = "Video";
    MessageType[MessageType["Voice"] = 3] = "Voice";
    MessageType[MessageType["Location"] = 4] = "Location";
    MessageType[MessageType["Sticker"] = 5] = "Sticker";
})(MessageType || (MessageType = {}));
;
class MessageMeta {
}
exports.MessageMeta = MessageMeta;
class Message {
}
exports.Message = Message;
