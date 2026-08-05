import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { bloodclash } from '../functions/bloodclash.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            id: buttonData[1],
            action: buttonData[2]
        }

        switch(data.action) {
            case "help":
                await bloodclash.accept(interaction, data.id);
            break;
            case "cancel":
                await bloodclash.cancel(interaction, data.id);
            break;
            case "finish":
                await bloodclash.finish(interaction, data.id);
            break;
        }

    }
}