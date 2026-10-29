import { starboard } from "../functions/starboard.js";

export const event = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        await reaction.fetch();
        await starboard.checkStars(reaction);
    }
};