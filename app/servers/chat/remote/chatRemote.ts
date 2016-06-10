import Mcontroller = require('../../../controller/ChatRoomManager');
import MUser = require('../../../controller/UserManager');
import User = require('../../../model/User');
import MChatService = require('../../../services/chatService');
import generic = require('../../../util/collections');
import Code = require('../../../../shared/Code');
import Room = require('../../../model/Room');
const ObjectID = require('mongodb').ObjectID;
const userManager = MUser.Controller.UserManager.getInstance();
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
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
    console.info("addOnlineUser", user);
    
    chatService.addOnlineUser(user, cb);
}
chatRemote.removeOnlineUser = function (userId, cb) {
    chatService.removeOnlineUser(userId);
    cb();
}
chatRemote.getOnlineUser = function (userId: string, callback: (err, user: User.OnlineUser) => void) {
    chatService.getOnlineUser(userId, callback);
}
chatRemote.getOnlineUsers = function (callback: (err, user: User.IOnlineUser) => void) {
    callback(null, chatService.OnlineUsers);
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
    console.warn("getChatService is deprecated fuction.");
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
    let channel = channelService.getChannel(rid, flag);
    let username = user.username;
    let uid = user.uid;

    console.log("chatRemote.add : user %s to room %s", user.username, rid);

    let param = {
        route: 'onAdd',
        user: user
    };
    channel.pushMessage(param);

    if (!!channel) {
        channel.add(uid, sid);
    }

    if (!!cb) cb();

//    var users = this.getUsers(rid, flag);
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
    let self = this;
    cb();
    if (!rid) {
        return;
    }

    
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
        var result: boolean = false;

        if (err || !room) {
            callback(null, result);
        }
        else {
            result = room.members.some(value => {
                if (value.id === userId) {
                    return true;
                }
            });

            callback(null, result);
        }
    });
}