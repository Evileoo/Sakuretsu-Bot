import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ChannelCreate,
    async execute(channel) {
        await trAlterEvent.channelCreate(channel);
    }
};