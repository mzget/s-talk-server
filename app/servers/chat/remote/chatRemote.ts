import Mcontroller = require('../../../controller/ChatRoomManager');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import MChatService = require('../../../services/chatService');
import generic = require('../../../util/collections');
import Code = require('../../../../shared/Code');
import Room = require('../../../model/Room');
var ObjectID = require('mongodb').ObjectID;
var userManager = MUser.Controller.UserManager.getInstance();
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var chatService: MChatService.ChatService;
var channelService;

module.exports = function (app) {
    return new ChatRemote(app);
};

var ChatRemote = function (app) {
    this.app = app;

    if(app.getServerType() === 'chat') {
        channelService = app.get('channelService');
        chatService = app.get('chatService');
        initServer();
    }
}

var chatRemote = ChatRemote.prototype;

/**
 * UpdateOnlineUsers.
 * The func call with 2 scenario,
 * 1. Call when user login success and joining in system.
 * 2. call when user logout.
 */
chatRemote.addOnlineUser = function (user, cb) {
    console.error("addOnlineUser");
    chatService.addOnlineUser(user, cb);
}
chatRemote.removeOnlineUser = function (userId, cb) {
    chatService.removeOnlineUser(userId);
    cb();
}
chatRemote.getOnlineUser = function (userId: string, callback: (err, user: User.OnlineUser) => void) {
    chatService.getOnlineUser(userId, callback);
}

chatRemote.addUserTransaction = function (userTransac: User.UserTransaction, cb) {
    if (chatService.userTransaction !== null) {
        if (!chatService.userTransaction[userTransac.uid]) {
            chatService.userTransaction[userTransac.uid] = userTransac;
        }
    }
    else {
        console.warn("chatService.userTransaction is null.");
    }

    cb();
}

chatRemote.updateRoomMembers = function (data, cb) {
    chatService.addRoom(data);

    if(!!cb) {
        cb();
    }
}

/**
* UpdateRoomsMap When New Room Has Create Then Push New Room To All Members.
*/
chatRemote.updateRoomsMapWhenNewRoomCreated = function (rooms: Array<Room.Room>, cb: Function) {
    rooms.forEach(room => {
        if(!chatService.RoomsMap[room._id]) {
            chatService.addRoom(room);
            
            //<!-- Notice all member of new room to know they have a new room.   
            var param = {
                route: Code.sharedEvents.onNewGroupCreated,
                data: room
            }

            var pushGroup = new Array();
            room.members.forEach(member => {
                chatService.getOnlineUser(member.id, (err, user) => {
                    if (!err) {
                        var item = { uid: user.uid, sid: user.serverId };
                        pushGroup.push(item);
                    }
                });
            });
            
            channelService.pushMessageByUids(param.route, param.data, pushGroup);
        }
    });

    cb();
} 

chatRemote.getChatService = function (cb: (users: User.IOnlineUser) => void) {
   cb(chatService.OnlineUsers);
}
 
 /**
  * Init Server this function call when server start.
  * for load room members from database to cache in memmory before.
  */
var initServer = function():void {
    chatRoomManager.getAllRooms(function (rooms) {
        //<!-- To reduce database retrive data. We store rooms Map data to server memory.
        console.info("init chatServer for get all rooms data to server memory.");
    
        chatService.setRoomsMap(rooms, () => { });
    });
}

/**
* Add user into chat channel.
* @param {String} uid unique id for user
* @param {String} sid server id
* @param {String} name channel name
* @param {boolean} flag channel parameter
*/
chatRemote.add = function (user: User.OnlineUser, sid, rid, flag, cb) {
    var channel = channelService.getChannel(rid, flag);
    var username = user.username;
    var uid = user.uid;

    console.log("chatRemote.add : user %s to room %s", user.username, rid);

    var param = {
        route: 'onAdd',
        user: user
    };
    channel.pushMessage(param);

    if (!!channel) {
        channel.add(uid, sid);
    }

//    var users = this.getUsers(rid, flag);
    chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, {status:1}, function (result) {
        cb(result)
    });
};

/**
* Get user from chat channel.
*
* @param {Object} opts parameters for request
* @param {String} name channel name
* @param {boolean} flag channel parameter
* @return {Array} users uids in channel
*
*/

chatRemote.getUsers = function (name, flag) {
    var users = [];
    var channel = channelService.getChannel(name, flag);
    if (!!channel) {
        users = channel.getMembers();
        console.warn("Heavy operation.!!! channel members: ", users);
    }
    for (var i = 0; i < users.length; i++) {
        users[i] = users[i].split('*')[0];
    }
    return users;
};

/**
* Kick user out chat channel.
* When user leave room. Server will update lastAccessTime of left room for them. 
* Then server return roomAccess data of left room to them.
*
* @param {String} uid unique id for user
* @param {String} sid server id
* @param {String} name channel name
*/
chatRemote.kick = function (user: User.OnlineUser, sid, rid, cb) {
    cb();
    if (!rid) {
        return;
    }

    var self = this;
    
    userManager.updateLastAccessTimeOfRoom(user.uid, rid, new Date(), function (err, accessInfo) {
        var printR = (accessInfo) ? accessInfo.result : null;
        console.log("chatRemote.kick : updateLastAccessRoom rid is %s: ", rid, printR);

        userManager.getRoomAccessOfRoom(uid, rid, function (err, res) {
            console.log("chatRemote.kick : getLastAccessOfRoom of %s", rid, res);
            if (channel) {
                var targetId = { uid: user.uid, sid: user.serverId };
                var group = new Array();
                group.push(targetId);

                var param = {
                    route: Code.sharedEvents.onUpdatedLastAccessTime,
                    data: res
                };

                channelService.pushMessageByUids(param.route, param.data, group);
            }
        });
    });


    var channel = channelService.getChannel(rid, false);
    //<!-- when user leave channel.
    if (!!channel) {
        var username = user.username;
        var uid = user.uid;
    
        console.log("uid %s leave channel ", uid);
        
        var param = {
            route: 'onLeave',
            user: username
        };
        channel.pushMessage(param);
        channel.leave(uid, sid);
    }
};

chatRemote.updateRoomAccess = function (uid: string, rid: string, date: Date, cb: (err, res) => void) {
    userManager.updateLastAccessTimeOfRoom(uid, rid, date, function (err, accessInfo) {
        console.log("updateLastAccessRoom rid is %s: ", rid, accessInfo.result);

        if (!!cb)
            cb(err, accessInfo);
    });
}

chatRemote.checkedCanAccessRoom = function (roomId: string, userId: string, callback: (err: Error, res: boolean) => void) {
    chatService.getRoom(roomId, (err, room) => {
        console.log("getRoomMembers rid is %s result is", roomId, room);

        var result: boolean = false;

        if (err || room === null) {
            callback(null, result);
        }
        else {
            room.members.forEach(value => {
                if (value.id === userId) {
                    result = true;
                    return;
                }
            });

            callback(null, result);
        }
    });
}