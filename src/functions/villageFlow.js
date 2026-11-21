import { globals } from '../globals.js';

// Helpers shared by village related commands and buttons

// Get a guild member, from cache or API. Returns null if the member isn't in the server
async function fetchMember(guild, id) {
    if(!id) return null;
    return guild.members.cache.get(id) ?? await guild.members.fetch(id).catch(() => null);
}

// Get a guild channel, from cache or API. Returns null if the channel doesn't exist anymore
async function fetchChannel(guild, id) {
    if(!id) return null;
    return guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
}

// Send a log message of a village.
// flag is one of the village flow_* columns: 0 = sent in the village flow, otherwise sent in the village moderation channel
async function sendLog(guild, village, flag, payload) {
    const channel = await fetchChannel(guild, flag == 0 ? village.flow : village.moderation);
    if(!channel) return null;

    try {
        return await channel.send(payload);
    } catch(error) {
        console.error(`Couldn't send the village log message: ${error.message}`);
        return null;
    }
}

// A member leaving a village loses his kage / sub kage roles and his access to the village moderation channel
async function removeVillageRanks(guild, member, village) {
    const ranks = [globals.server.role.sub, globals.server.role.kage].filter(role => member.roles.cache.has(role));
    if(ranks.length > 0) await member.roles.remove(ranks);

    const moderation = await fetchChannel(guild, village?.moderation);
    if(moderation) await moderation.permissionOverwrites.delete(member.id).catch(() => null);
}

export const villageFlow = { fetchMember, fetchChannel, sendLog, removeVillageRanks };
