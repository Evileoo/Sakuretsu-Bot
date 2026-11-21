import { MessageFlags } from 'discord.js';
import { docs } from '../functions/docs.js';

// Old "How to help ?" button of the Blood Clash list (replaced by a link to the documentation)
export const button = {
    async execute(interaction, buttonData){
        await interaction.reply({
            content: `How to help in Blood Clash : ${docs.mention(`blood-clash-help`)}`,
            flags: MessageFlags.Ephemeral
        });
    }
}
