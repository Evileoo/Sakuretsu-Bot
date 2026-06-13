import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        translation.messageTranslate(message);
    }
}