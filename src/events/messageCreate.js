import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';
import { manageEmojis } from '../functions/emojis.js';
import { bc } from '../functions/bloodclash.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        // Detect if blood clash help + treatment
        await bc.filter(message);

        // Translate the message if required
        await translation.messageManage(message, "send");
    }
}