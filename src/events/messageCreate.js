import { Events } from 'discord.js';
import { bc } from '../functions/bloodclash.js';

// Executed when a message is sent
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        // Detect if blood clash help + treatment
        await bc.filter(message);
    }
}
