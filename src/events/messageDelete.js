import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageDelete,
    async execute(message){
        if(!message.guild) return;
        // Translate the message if required
        await translation.messageManage(message, "delete");
    }
}