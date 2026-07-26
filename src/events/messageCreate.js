import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';
import { manageEmojis } from '../functions/emojis.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        translation.messageTranslate(message);

        await bc(message);

        async function bc(message) {
            if(message.channel.id != globals.server.channel.bloodClash &&
               (message.channel.parentId == "1478130471585054893" || message.channel.parentId == "1509429572830236843")
            ) {
                if(message.content.includes("help") && (message.content.includes("bc") || message.content.includes("floor"))) {
                    message.delete();
                    const channel = message.guild.channels.cache.get(message.channel.id);
                    channel.send(`<@${message.author.id}>, you can ask for blood clash help only in <#${globals.server.channel.bloodClash}>`);
                }
            }
        }
    }
}