import { EmbedBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageFlow } from './villageFlow.js';
import { nameUpdates } from './nameUpdates.js';

// Send a private message to a member, without failing if his DMs are closed
async function notify(user, content) {
    try {
        await user.send({ content });
        return true;
    } catch(error) {
        return false;
    }
}

// Close the message of an application in the village moderation channel
async function closeApplicationMessage(guild, application, status, color) {
    if(!application.moderation || !application.message_id) return;

    const channel = await villageFlow.fetchChannel(guild, application.moderation);
    const message = channel ? await channel.messages.fetch(application.message_id).catch(() => null) : null;
    if(!message || !message.embeds[0]) return;

    const embed = EmbedBuilder.from(message.embeds[0])
    .setColor(color)
    .setFooter({ text: status });

    await message.edit({ embeds: [embed], components: [] }).catch(() => null);
}

// Cancel the pending applications of a member (he joined a village, left the server...)
async function cancelApplications(guild, memberId, reason) {
    const applications = await db.getall(`SELECT a.id, a.message_id, v.moderation FROM application a LEFT JOIN village v ON v.tag = a.village_tag WHERE a.member_id = ?`, [memberId]);

    for(const application of applications) {
        await db.delete(`DELETE FROM application WHERE id = ?`, [application.id]);
        await closeApplicationMessage(guild, application, `Application cancelled : ${reason}`, globals.embed.grey);
    }

    return applications.length;
}

// Add a member (guild member) without village to a village: roles, database, name and flow message
async function addToVillage(guild, member, village, flowDescription) {
    await member.roles.remove(globals.server.role.lone);
    await member.roles.add(village.role_id);

    await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [village.tag, member.id]);
    await nameUpdates.updateName(member.id, guild);

    // His other applications are not needed anymore
    await cancelApplications(guild, member.id, `joined [${village.tag}]`);

    const flowEmbed = new EmbedBuilder()
    .setTitle(`New member`)
    .setDescription(flowDescription)
    .setColor(globals.embed.green)
    .setTimestamp();

    await villageFlow.sendLog(guild, village, village.flow_incoming, { embeds: [flowEmbed] });
}

// The Kage left his village: the BroKage of the village who has been in the server for the longest time becomes Kage
// Returns the new Kage (guild member) or null if the village has no BroKage
async function promoteSuccessor(guild, village, formerKageId) {
    const ids = await db.getvals(`SELECT id FROM member WHERE village_tag = ? AND id <> ?`, [village.tag, formerKageId]);

    const candidates = [];
    for(const id of ids) {
        const member = await villageFlow.fetchMember(guild, id);
        if(member && member.roles.cache.has(globals.server.role.sub) && !member.roles.cache.has(globals.server.role.kage)) candidates.push(member);
    }

    candidates.sort((a, b) => (a.joinedTimestamp ?? Infinity) - (b.joinedTimestamp ?? Infinity));
    const successor = candidates[0] ?? null;

    if(successor) {
        await successor.roles.add(globals.server.role.kage);

        const moderation = await villageFlow.fetchChannel(guild, village.moderation);
        if(moderation) await moderation.permissionOverwrites.edit(successor.id, { ViewChannel: true });
    }

    return successor;
}

export const villageMembership = { notify, closeApplicationMessage, cancelApplications, addToVillage, promoteSuccessor };
