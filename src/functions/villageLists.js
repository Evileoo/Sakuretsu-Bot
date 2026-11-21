import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageFlow } from './villageFlow.js';

// Registration / waiting lists of the village events (/village list).
// The registration order gives the places: the first "slots" members are registered, the next ones are in the
// waiting list. When a registered member leaves, the first one of the waiting list gets his place.

// Registrations in order, as saved
async function rawEntries(listId) {
    return await db.getvals(`SELECT member_id FROM village_list_member WHERE list_id = ? ORDER BY id`, [listId]);
}

// Registrations in order, without the members who left the village since
async function getEntries(list) {
    await db.delete(`DELETE FROM village_list_member WHERE list_id = ? AND member_id NOT IN (SELECT id FROM member WHERE village_tag = ?)`, [list.id, list.village_tag]);
    return await rawEntries(list.id);
}

function split(list, entries) {
    if(list.slots == null) return { registered: entries, waiting: [] };
    return { registered: entries.slice(0, list.slots), waiting: entries.slice(list.slots) };
}

// Members having a place, to find who got one after a change
async function registeredIds(list) {
    return new Set(split(list, await rawEntries(list.id)).registered);
}

// Numbered mentions, cut to fit in max characters
function fit(ids, max) {
    if(ids.length == 0) return `*Nobody*`;
    let text = ``;
    for(let i = 0; i < ids.length; i++) {
        const line = `${i + 1}. <@${ids[i]}>\n`;
        const rest = `… and ${ids.length - i} more`;
        if(text.length + line.length + rest.length > max) return text + rest;
        text += line;
    }
    return text.trimEnd();
}

// Message of the list: embed and buttons
function message(list, entries) {
    const { registered, waiting } = split(list, entries);
    const intro = list.description ? `${list.description}\n\n` : ``;
    const registeredTitle = `**Registered — ${registered.length}${list.slots != null ? `/${list.slots}` : ``}**`;
    const waitingTitle = `**Waiting list — ${waiting.length}**`;

    // Embed description: 4096 characters at most
    const available = 4000 - intro.length - registeredTitle.length - waitingTitle.length;
    let description = intro;
    if(list.slots == null) {
        description += `${registeredTitle}\n${fit(registered, available)}`;
    } else {
        const registeredText = fit(registered, Math.floor(available * 0.6));
        description += `${registeredTitle}\n${registeredText}\n\n${waitingTitle}\n${fit(waiting, available - registeredText.length)}`;
    }

    const embed = new EmbedBuilder()
    .setTitle(`📋 ${list.title}`)
    .setDescription(description)
    .setColor(list.closed ? globals.embed.grey : globals.embed.green)
    .setFooter({ text: list.closed ? `Registrations closed` : list.slots != null ? `Registrations open · the waiting list gets the places that free up` : `Registrations open` });

    const separator = globals.separator;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId(`vlist${separator}j${separator}${list.id}`)
        .setLabel(`Join`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!!list.closed),
        new ButtonBuilder()
        .setCustomId(`vlist${separator}l${separator}${list.id}`)
        .setLabel(`Leave`)
        .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
        .setCustomId(`vlist${separator}c${separator}${list.id}`)
        .setLabel(list.closed ? `Reopen (Kage)` : `Close (Kage)`)
        .setStyle(list.closed ? ButtonStyle.Primary : ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
}

async function fetchMessage(guild, list) {
    const channel = await villageFlow.fetchChannel(guild, list.channel_id);
    if(!channel || !list.message_id) return null;
    return await channel.messages.fetch(list.message_id).catch(() => null);
}

// Shows the new state of the list (in the button interaction, or by editing the message) and pings the members
// who got a place from the waiting list. before: registeredIds() before the change. actorId: member who made the change
async function refresh(guild, list, before, { interaction = null, actorId = null } = {}) {
    const entries = await getEntries(list);
    const payload = message(list, entries);

    let listMessage = null;
    if(interaction) {
        await interaction.update(payload);
        listMessage = interaction.message;
    } else {
        listMessage = await fetchMessage(guild, list);
        if(listMessage) await listMessage.edit(payload);
    }

    // Also when the list gets no limit anymore: all the waiting list gets a place
    if(!before) return entries;

    const promoted = split(list, entries).registered.filter(id => !before.has(id) && id != actorId);
    if(promoted.length > 0) {
        const channel = listMessage?.channel ?? await villageFlow.fetchChannel(guild, list.channel_id);
        if(channel) await channel.send({
            content: `${promoted.map(id => `<@${id}>`).join(` `)} a place is free in **${list.title}**: you are now registered`,
            allowedMentions: { users: promoted },
            ...(listMessage ? { reply: { messageReference: listMessage.id, failIfNotExists: false } } : {})
        }).catch(error => console.error(`Couldn't send the village list promotion: ${error.message}`));
    }

    return entries;
}

// Sends the message of a new list in the channel
async function create(channel, village, creatorId, data) {
    const id = await db.insert(`INSERT INTO village_list (village_tag, channel_id, title, description, slots, creator_id) VALUES (?, ?, ?, ?, ?, ?)`, [
        village.tag, channel.id, data.title, data.description, data.slots, creatorId
    ]);
    const list = await db.getrow(`SELECT * FROM village_list WHERE id = ?`, [id]);

    const listMessage = await channel.send(message(list, []));
    await db.update(`UPDATE village_list SET message_id = ? WHERE id = ?`, [listMessage.id, id]);

    return { ...list, message_id: listMessage.id };
}

// Where a member is in the list: "registered", a waiting list position (1, 2…) or null
function position(list, entries, memberId) {
    const index = entries.indexOf(memberId);
    if(index == -1) return null;
    if(list.slots == null || index < list.slots) return `registered`;
    return index - list.slots + 1;
}

// Deletes the lists of a village (/village delete)
async function deleteVillageLists(tag) {
    await db.delete(`DELETE FROM village_list_member WHERE list_id IN (SELECT id FROM village_list WHERE village_tag = ?)`, [tag]);
    await db.delete(`DELETE FROM village_list WHERE village_tag = ?`, [tag]);
}

export const villageLists = { rawEntries, getEntries, registeredIds, message, fetchMessage, refresh, create, position, deleteVillageLists };
