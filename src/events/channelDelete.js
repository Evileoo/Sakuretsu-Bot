import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ChannelDelete,
    async execute(channel) {
        await trAlterEvent.channelDelete(channel);
    }
};
