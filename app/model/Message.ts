enum MessageType { Text = 0, Image = 1, Video = 2, Voice =3, Location = 4, Sticker = 5 };
export class MessageMeta {
    duration: string;
    thumbnail:string;
    name: string;
    mimeType: string;
    size: string;
}

export class Message {
    _id: string;
    rid: string;
    type: MessageType;
    body: string;
    sender: string;
    duration: string;
    resolution:string;
    createTime: Date;
    readers: string[];
    meta: MessageMeta;
    /**
     * uuid mean client side uuid.
     */
    uuid: string;
}