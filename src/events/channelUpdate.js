import { Events } from 'discord.js';
import { villageFlow } from '../functions/villageFlow.js';

// The channels of a deleted village category go back in the category created again
export const event = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel){
        if(!newChannel.guild) return;
        await villageFlow.onChannelUnparented(oldChannel, newChannel);
    }
}
