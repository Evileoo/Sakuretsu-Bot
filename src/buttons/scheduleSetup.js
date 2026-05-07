import {  } from 'discord.js';
import { messageContent } from '../functions/messageContent.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            category: `schedule`,
            messageId: buttonData[1],
            messageType: `update`
        }

        await messageContent.sendMessage(data, interaction);

    }
}