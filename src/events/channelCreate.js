import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ChannelCreate,
    async execute(channel) {
        console.log(channel.id);
        await trAlterEvent.channelCreate(channel);
    }
};