import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';
import { manageEmojis } from '../functions/emojis.js';
import { bloodclash } from '../functions/bloodclash.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        // Detect if blood clash help + treatment
        await bloodclash.detector(message);

        // Detect if it's a blood clash lobby end message + treatment
        await bloodclash.endLobby(message);

        // Translate the message if required
        //await translation.messageTranslate(message);
    }
}