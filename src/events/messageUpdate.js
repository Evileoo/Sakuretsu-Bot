import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage){
        // Translate the message if required
        if (newMessage.webhookId) return;
        await translation.messageManage(newMessage, "edit");
    }
}