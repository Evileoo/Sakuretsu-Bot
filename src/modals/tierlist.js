import { MessageFlags } from 'discord.js';
import { tierlist } from '../functions/tierlist.js';

// Executed when bot is ready
export const modal = {
    async execute(interaction, modalData){
        await tierlist.updatePersonalTierlist(interaction, modalData);
    }
}