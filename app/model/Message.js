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
var MessageMeta = (function () {
    function MessageMeta() {
    }
    return MessageMeta;
})();
exports.MessageMeta = MessageMeta;
var Message = (function () {
    function Message() {
    }
    return Message;
})();
exports.Message = Message;
