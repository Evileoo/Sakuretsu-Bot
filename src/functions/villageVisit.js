import { EmbedBuilder, OverwriteType, Routes } from 'discord.js';
import schedule from 'node-schedule';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageFlow } from './villageFlow.js';

// Moderator visits: a moderator sees and writes in all the channels of a village for some time, to help it,
// without joining it (no village role, no tag in his name). The access is a member overwrite on the category and on
// every channel of it (the channels don't follow the category permissions after their creation).
// The overwrites the moderator already had there are saved and restored at the end of the visit.

const visitPermissions = {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: true,
    Connect: true
};

// Category and channels of a village
async function villageChannels(guild, village) {
    const category = await villageFlow.fetchChannel(guild, village.category);
    if(!category) return [];
    return [category, ...guild.channels.cache.filter(c => c.parentId == category.id).values()];
}

async function sendFlow(guild, village, title, description, color) {
    const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

    // Always in flow: the village must know a moderator can see its channels
    await villageFlow.sendLog(guild, village, 0, { embeds: [embed] });
}

// Starts a visit, or extends it if the moderator is already visiting the village
async function start(guild, village, memberId, hours) {
    const existing = await db.getrow(`SELECT member_id FROM village_visit WHERE village_tag = ? AND member_id = ?`, [village.tag, memberId]);
    const end = Math.floor(Date.now() / 1000) + hours * 3600;

    if(existing) {
        await db.update(`UPDATE village_visit SET end_date = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE village_tag = ? AND member_id = ?`, [hours, village.tag, memberId]);
        await sendFlow(guild, village, `Moderator visit extended`, `<@${memberId}> stays in the village until <t:${end}:f>`, globals.embed.purple);
        return { extended: true, end };
    }

    const channels = await villageChannels(guild, village);
    const previous = {};
    for(const channel of channels) {
        const overwrite = channel.permissionOverwrites.cache.get(memberId);
        if(overwrite) previous[channel.id] = { allow: overwrite.allow.bitfield.toString(), deny: overwrite.deny.bitfield.toString() };
    }

    // Saved before giving the access: if the bot stops in between, the end of the visit still cleans everything
    await db.insert(`INSERT INTO village_visit (village_tag, member_id, end_date, previous_overwrites) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), ?)`, [village.tag, memberId, hours, JSON.stringify(previous)]);

    for(const channel of channels) {
        await channel.permissionOverwrites.edit(memberId, visitPermissions, { type: OverwriteType.Member, reason: `Moderator visit of [${village.tag}]` });
    }

    await sendFlow(guild, village, `Moderator visit`, `<@${memberId}> is visiting the village to help, until <t:${end}:f>`, globals.embed.purple);
    return { extended: false, end };
}

// Ends a visit: the overwrites go back to what they were before. reason: "left" or "expired"
async function end(guild, visit, reason) {
    await db.delete(`DELETE FROM village_visit WHERE village_tag = ? AND member_id = ?`, [visit.village_tag, visit.member_id]);

    const village = await db.getrow(`SELECT tag, category, flow, moderation FROM village WHERE tag = ?`, [visit.village_tag]);
    if(!village) return;

    let previous = {};
    try {
        previous = JSON.parse(visit.previous_overwrites ?? `{}`) ?? {};
    } catch(error) {
        console.error(`Invalid previous overwrites of the visit ${visit.village_tag}/${visit.member_id}`);
    }

    // Also the channels created during the visit: they copied the category permissions
    for(const channel of await villageChannels(guild, village)) {
        try {
            if(previous[channel.id]) {
                // Exact bitfields of before the visit
                await guild.client.rest.put(Routes.channelPermission(channel.id, visit.member_id), {
                    body: { type: OverwriteType.Member, allow: previous[channel.id].allow, deny: previous[channel.id].deny },
                    reason: `End of the moderator visit of [${village.tag}]`
                });
            } else if(channel.permissionOverwrites.cache.has(visit.member_id)) {
                await channel.permissionOverwrites.delete(visit.member_id, `End of the moderator visit of [${village.tag}]`);
            }
        } catch(error) {
            console.error(`Couldn't remove the visit access of ${visit.member_id} in ${channel.id}: ${error.message}`);
        }
    }

    await sendFlow(guild, village, `Moderator visit ended`, `<@${visit.member_id}> ${reason == "left" ? `left the village` : `doesn't have access to the village anymore`}`, globals.embed.grey);
}

// Ends the visits whose time is over, every minute (also the ones that ended while the bot was off)
function routine(client) {
    schedule.scheduleJob(`village visits`, '30 * * * * *', async function() {
        try {
            const visits = await db.getall(`SELECT * FROM village_visit WHERE end_date <= NOW()`);
            if(visits.length == 0) return;

            const guild = await client.guilds.fetch(globals.server.id);
            for(const visit of visits) {
                await end(guild, visit, `expired`);
            }
        } catch(error) {
            console.error(`Village visits routine error`);
            console.error(error);
        }
    });
}

export const villageVisit = { start, end, routine, visitPermissions };
