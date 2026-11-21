import { Events } from 'discord.js';
import { villageFlow } from '../functions/villageFlow.js';

// A village category deleted by a Kage or a BroKage is created again
export const event = {
    name: Events.ChannelDelete,
    async execute(channel){
        if(!channel.guild) return;
        await villageFlow.onCategoryDelete(channel);
    }
}
