import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { lists } from '../functions/lists.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            page: buttonData[2],
            type: buttonData[3],
            id: buttonData[4] == 'null' ? null : buttonData[4]
        }

        await lists.statusList(interaction, data.page, data.action, data.type, data.id, interaction.message.id);

    }
}