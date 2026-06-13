import {  } from 'discord.js';
import { messageContent } from '../functions/messageContent.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            userId: buttonData[1],
            action: buttonData[2]
        }

        console.log("aaaaaa");

    }
}