export interface IUserGroup {
    uid: string;
    sid: string;
}

export interface Channel {
    add: (uid, sid) => boolean;
    leave: (uid, sid) => boolean;
    getMembers: () => any[];
    getMember: (uid) => any;
    destroy: () => void;
    pushMessage: (route, msg, opts?, cb?) => void;
}

interface IChannelService {
    /**
     * ChannelService.prototype.createChannel()
    Params

        name - channel's name

    Create channel with name.
     */
    createChannel: (name: string) => Channel;

    /**
     * ChannelService.prototype.getChannel()
    Params

        name - channel's name
        create - if true, create channel

    Get channel by name.
     */
    getChannel: (name, create) => Channel;

    /**
     * ChannelService.prototype.destroyChannel()
    Params

        name - channel name

    Destroy channel by name.
     */
    destroyChannel: (name) => void;

    /**
     * ChannelService.prototype.pushMessageByUids()
    Params
        route - message route
        msg - message that would be sent to client
        uids - the receiver info list, [{uid: userId, sid: frontendServerId}]
        opts - user-defined push options, optional
        cb - cb(err)

    Push message by uids. Group the uids by group. ignore any uid if sid not specified.
     */
    pushMessageByUids: (route: string, msg: any, uids: Array<IUserGroup>, opts?, cb?) => void;

    /**
     * ChannelService.prototype.broadcast()
    Params
        stype - frontend server type string
        route - route string
        msg - message
        opts - user-defined broadcast options, optional
        cb - callback

    Broadcast message to all the connected clients.
     */
    broadcast: (stype: string, route: string, msg: any, opts?, cb?) => void;
}

export default IChannelService;