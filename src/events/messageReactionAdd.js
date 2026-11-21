import { starboard } from "../functions/starboard.js";

export const event = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        // The message may have been deleted in the meantime
        try {
            if(reaction.partial) await reaction.fetch();
            if(reaction.message.partial) await reaction.message.fetch();
        } catch(error) {
            return;
        }

        await starboard.checkStars(reaction);
    }
};