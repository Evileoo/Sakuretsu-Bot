import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        await trAlterEvent.channelUpdate(oldChannel, newChannel);
    }
};
