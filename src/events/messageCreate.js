import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { translation } from '../functions/translation.js';
import { manageEmojis } from '../functions/emojis.js';

// Executed when bot is ready
export const event = {
    name: Events.MessageCreate,
    async execute(message){
        translation.messageTranslate(message);

        await filter(message);

        async function filter(message) {
            if(message.channel.id != globals.server.channel.bloodClash &&
               (message.channel.parentId == "1478130471585054893" || message.channel.parentId == "1509429572830236843")
            ) {
                if((message.content.includes("help") || message.content.includes("need")) && (message.content.includes("bc") || message.content.includes("floor"))) {
                    message.delete();
                    const channel = message.guild.channels.cache.get(message.channel.id);
                    channel.send(`<@${message.author.id}>, you can ask for blood clash help only in <#${globals.server.channel.bloodClash}>`);
                }
            } else {
                if(!message.author.bot && message.channel.id == globals.server.channel.bloodClash) {
                    await bcHelp(message);
                }
            }
        }



        async function bcHelp(message) {
            // Check if a help request hasn't been sent recently
            const channel = message.guild.channels.cache.get(message.channel.id);
            const timeLimit = 21600000;

            const messages = await channel.messages.fetch({ limit: 100, before: message.id });

            const now = new Date();

            let block = false;
            let lastMessage = 0;
            for(const m of messages) {
                if(
                    message.author.id == m[1].author.id && 
                    now - m[1].createdTimestamp < timeLimit &&
                    message.content.includes("help") || message.content.includes("bc") &&
                    m[1].id != messages.first().id
                ) {
                    block = true;
                    lastMessage = m[1].createdTimestamp;
                    break;
                }
            }

            if(block) {
                message.delete();
                channel.send({
                    content: `<@${message.author.id}> don't spam help requests. Next help request allowed <t:${((lastMessage + timeLimit)/1000).toFixed(0)}:R>`
                })
            }
            
        }
    }
}