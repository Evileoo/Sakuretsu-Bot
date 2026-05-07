import { EmbedBuilder } from 'discord.js';

const guildId = "1478130301552033982";
const logChannel = "1498373561633738754";

async function sendMessage(data, client) {

    // Prepare embed
    const embed = new EmbedBuilder()
    .setTitle(`${data.title}`)
    .setAuthor({name: `${data.author}`})
    .setColor(data.color)
    .setDescription(`${data.description}`)
    .setTimestamp();
    
    // Get guild and channel objects
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.cache.get(logChannel);

    await channel.send({
        embeds: [embed]
    });
}

export const managementLog = {sendMessage};