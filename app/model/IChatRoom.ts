import room = require('./Room');

interface IChatRoom {
    id: string;
    name: string;
    data: room.Room;
}