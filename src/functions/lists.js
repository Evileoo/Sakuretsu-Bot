import { EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

async function notebookList(interaction, page, action) {

    const linesByPage = 10;

    const getList = await db.getall(`SELECT name, visibility FROM notebook WHERE id = ? ORDER BY name ASC`, [interaction.user.id]);
    
    if(getList.length == 0) {
        return await interaction.reply({
            content: `You don't have any notebook`,
            flags: MessageFlags.Ephemeral
        });
    }

    const pageAmount = getList.length / linesByPage;

    const embed = new EmbedBuilder()
    .setTitle(`My notebooks`)
    .setColor(globals.embed.black);

    const previous = new ButtonBuilder()
    .setLabel(`Previous`)
    .setStyle(ButtonStyle.Secondary)

    const next = new ButtonBuilder()
    .setLabel(`Next`)
    .setStyle(ButtonStyle.Secondary)

    let visibility = "";
    let name = "";

    if(action == "p") page--;
    else page++;

    const start = page * linesByPage;
    const limit = start + linesByPage;
    console.log(start, limit)
    for(let i = start; i < limit; i++) {
        name += `${getList[i].name}\n`;
        visibility += `${(visibility == 0) ? "Public" : "Private"}\n`;
    }

    embed.addFields(
        { name: `Name`, value: `${name}`, inline: true },
        { name: `Visibility`, value: `${visibility}`, inline: true }
    );

    previous
    .setCustomId(`nbList${globals.separator}p${globals.separator}${page}`)
    .setDisabled(page == 0);

    next
    .setCustomId(`nbList${globals.separator}n${globals.separator}${page}`)
    .setDisabled(limit >= getList.length - 1);
    
    const row = new ActionRowBuilder()
    .addComponents(previous, next);

    await interaction.update({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

async function statusList(interaction, page, action, type, id, messageId) {

    const linesByPage = 10;

    const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

    let statusQuery = `SELECT member_id, member_name, status, reason FROM status WHERE village_tag = '${member.village_tag}' `;
    if(type == "warn" || type == "ban") statusQuery += `AND status = '${type}' `;
    if(id != null) statusQuery += `AND member_id = '${id}' `;
    statusQuery += `ORDER BY date DESC`;

    const statusList = await db.getall(statusQuery);

    if(statusList.length == 0) {
        return await interaction.reply({
            content: `There is no ban/warn`,
            flags: MessageFlags.Ephemeral
        });
    }

    const pageAmount = statusList.length / linesByPage;

    const embed = new EmbedBuilder()
    .setTitle(`Village bans and warns`)
    .setColor(globals.embed.black);

    const previous = new ButtonBuilder()
    .setLabel(`Previous`)
    .setStyle(ButtonStyle.Secondary)

    const next = new ButtonBuilder()
    .setLabel(`Next`)
    .setStyle(ButtonStyle.Secondary)

    let status = "";
    let nameId = "";
    let reason = "";

    if(action == "p") page--;
    else page++;

    const start = page * linesByPage;
    const limit = start + linesByPage;

    for(let i = start; i < limit; i++) {
        nameId += `${statusList[i].member_name}(${statusList[i].member_id})\n`;
        status += `${statusList[i].status}\n`;
        reason += `${statusList[i].reason ? statusList[i].reason : "-"}\n`;

        if(!statusList[i+1]) i = limit;
    }

    embed.addFields(
        { name: `Name / ID`, value: `${nameId}`, inline: true },
        { name: `Type`, value: `${status}`, inline: true },
        { name: `Reason`, value: `${reason}`, inline: true }
    );

    previous
    .setCustomId(`stList${globals.separator}p${globals.separator}${page}${globals.separator}${type}${globals.separator}${id}`)
    .setDisabled(page == 0);

    next
    .setCustomId(`stList${globals.separator}n${globals.separator}${page}${globals.separator}${type}${globals.separator}${id}`)
    .setDisabled(limit > statusList.length - 1);
    
    const row = new ActionRowBuilder()
    .addComponents(previous, next);

    const channel = await interaction.channel;
    const message = channel.messages.cache.get(messageId);

    await message.edit({
        content: ``,
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });

    try {
        await interaction.deferUpdate();
    } catch(err) {

    }

}

export const lists = { notebookList, statusList };