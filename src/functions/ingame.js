import { EmbedBuilder } from 'discord.js';
import schedule from 'node-schedule';

const guildId = "1478130301552033982";
const eventChannel = "1478133200109965497";

async function eventPanel(client) {
    // Get guild and channel objects
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.cache.get(eventChannel);

    // Check if the panel is here
    const fetched = await channel.messages.fetch({limit:100});
    const panel = fetched.last();

    

    // Create panel update routine
    //const missionBoardUpdates = schedule.scheduleJob('* /1 * * * *', function() {
        // Get date
        const now = new Date();

        const auction1 = (now.getHours() > 12) ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 12, 0, 0)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
        const auction2 = (now.getHours() > 20) ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 20, 0, 0)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0));
        const auction1Disp = auction1 / 1000;
        const auction2Disp = auction2 / 1000;
        
        // Create discord embed
        const missionBoard = new EmbedBuilder()
        .setTitle(`Mission Board`)
        .addFields(
            {name: "Auctions", value: `<t:${auction1Disp}:t>: <t:${auction1Disp}:R>\n<t:${auction2Disp}:t>: <t:${auction2Disp}:R>`, inline: false}
        )
        .setTimestamp()

        if(panel) { // Panel is here
            await panel.edit({
                embeds: [missionBoard]
            });
        } else { // Panel is not here
            await channel.send({
                embeds: [missionBoard]
            });
        }

        if((now.getHours() == auction1.getHours() -1 || now.getHours() == auction2.getHours() - 2) && now.getMinutes() == 50) {
            await channel.send(`<@&1478135570696769638>, Leaf Village Defense starts in 10 minutes, get ready`);
        }


    //});
}



export const ingame = {eventPanel};