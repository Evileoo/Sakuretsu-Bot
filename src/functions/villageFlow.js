import { AuditLogEvent, ChannelType, PermissionsBitField } from 'discord.js';
import { db } from '../connections/database.js';
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

// ---------------------------------------------------------------- village category permissions
// The Kage and the BroKages manage their village category with the Discord permissions:
// - on the category, "Manage Channels" (create channels in it) and "Mention @everyone, @here and All Roles"
//   (mention their village role). The channels they create copy the category permissions, so they can edit and
//   delete them. A mention only notifies the members who can see the channel, and the other villages can't see
//   this category, so they can't be pinged from here.
// - on the channels made by the bot, "Manage Channels" is denied so they can't be edited or deleted.
// The Kage and BroKage roles are shared by all the villages, so these permissions are only set on the village channels.
const rankRoles = () => [globals.server.role.kage, globals.server.role.sub];

function categoryOverwrites(guild, village) {
    return [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: village.role_id, allow: [PermissionsBitField.Flags.ViewChannel] },
        ...rankRoles().map(id => ({
            id: id,
            allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MentionEveryone]
        }))
    ];
}

// A channel made by the bot in a village category: the Kage and the BroKages can't edit or delete it
async function protectChannel(channel) {
    for(const role of rankRoles()) {
        await channel.permissionOverwrites.edit(role, { ManageChannels: false, MentionEveryone: true });
    }
}

// ---------------------------------------------------------------- deleted village category
// "Manage Channels" on the category also lets the Kage and the BroKages delete it. Discord then keeps its channels,
// without category: the bot creates the category again and moves them back in.
const deletingCategories = new Set();   // categories deleted by the bot itself (/village delete)
const repairs = new Map();              // village tag => promise of the new category

// Called by /village delete before deleting the category, so it isn't created again
function expectCategoryDelete(categoryId) {
    deletingCategories.add(categoryId);
    setTimeout(() => deletingCategories.delete(categoryId), 60000);
}

// Returns the category of the village, created again if it was deleted. Several events can ask for it at the same time
async function repairCategory(guild, village, deleted = null) {
    if(!repairs.has(village.tag)) {
        repairs.set(village.tag, (async () => {
            const current = await db.getrow(`SELECT tag, name, category, role_id, moderation FROM village WHERE tag = ?`, [village.tag]);
            if(!current) return null;

            // Asked to Discord: the deleted category can still be in the cache
            const existing = current.category ? await guild.channels.fetch(current.category, { force: true }).catch(() => null) : null;
            if(existing) return existing;

            const category = await guild.channels.create({
                name: deleted?.name ?? current.name,
                type: ChannelType.GuildCategory,
                position: deleted?.rawPosition,
                permissionOverwrites: categoryOverwrites(guild, current),
                reason: `The category of [${current.tag}] was deleted`
            });
            await db.update(`UPDATE village SET category = ? WHERE tag = ?`, [category.id, current.tag]);

            // Who deleted it (the bot has access to the audit log)
            const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 10 }).catch(() => null);
            const executor = logs?.entries.find(entry => entry.targetId == current.category)?.executorId;

            const moderation = await fetchChannel(guild, current.moderation);
            if(moderation) await moderation.send({
                content: `The village category was deleted${executor ? ` by <@${executor}>` : ``}, it has been restored with its channels`,
                allowedMentions: { parse: [] }
            }).catch(() => null);

            return category;
        })().finally(() => setTimeout(() => repairs.delete(village.tag), 60000)));
    }
    return await repairs.get(village.tag);
}

// channelDelete event: a village category was deleted
async function onCategoryDelete(channel) {
    if(channel.type != ChannelType.GuildCategory || deletingCategories.has(channel.id)) return;

    const village = await db.getrow(`SELECT tag FROM village WHERE category = ?`, [channel.id]);
    if(!village) return;

    const category = await repairCategory(channel.guild, village, channel);
    if(!category) return;

    // Its channels still known in the cache with the old category
    for(const child of channel.guild.channels.cache.filter(c => c.parentId == channel.id).values()) {
        await child.setParent(category.id, { lockPermissions: false }).catch(() => null);
    }
}

// channelUpdate event: Discord removes the category of the channels of a deleted category
async function onChannelUnparented(oldChannel, newChannel) {
    if(!oldChannel.parentId || newChannel.parentId || deletingCategories.has(oldChannel.parentId)) return;

    const village = await db.getrow(`SELECT tag FROM village WHERE category = ?`, [oldChannel.parentId]);
    if(!village) return;

    // If this event comes before the channelDelete one, the deleted category is still in the cache (name, position)
    const deleted = newChannel.guild.channels.cache.get(oldChannel.parentId) ?? null;

    // Moved out by a moderator, the category still exists: nothing to do
    if(await newChannel.guild.channels.fetch(oldChannel.parentId, { force: true }).catch(() => null)) return;

    const category = await repairCategory(newChannel.guild, village, deleted);
    if(category && newChannel.parentId != category.id) {
        await newChannel.setParent(category.id, { lockPermissions: false }).catch(() => null);
    }
}

export const villageFlow = { fetchMember, fetchChannel, sendLog, removeVillageRanks, categoryOverwrites, protectChannel, expectCategoryDelete, repairCategory, onCategoryDelete, onChannelUnparented };
