import { starboard } from "../functions/starboard";

export const event = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        await starboard.checkStars(reaction);
    }
};