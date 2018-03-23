"use strict";
// chatroomService.getRoom(rid).then((room: Room) => {
//     console.log("getRoom", room);
//     chatroomService.checkedCanAccessRoom(room, uid, (err, res) => {
//         console.log("checkedCanAccessRoom: ", res);
//         if (err || res === false) {
//             clearTimeout(timeOutId);
//             next(null, {
//                 code: Code.FAIL,
//                 message: "cannot access your request room. may be you are not a member or leaved room!",
//             });
//         } else {
//             session.set("rid", rid);
//             session.push("rid", (error: Error) => {
//                 if (error) {
//                     console.error("set rid for session service failed! error is : %j", error.stack);
//                 }
//             });
//             const onlineUser = {} as UserSession;
//             onlineUser.username = uname;
//             onlineUser.uid = uid;
//             self.addChatUser(self.app, session, onlineUser, self.app.get("serverId"), rid, () => {
//                 clearTimeout(timeOutId);
//                 next(null, { code: Code.OK, data: room });
//             });
//         }
//     });
// }).catch((err) => {
//     clearTimeout(timeOutId);
//     next(null, { code: Code.FAIL, message: err });
// });
