import { EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Display the village sanctions list
// Called by the "/village sanctions" command (page = -1, action = "n") and by the stList buttons
async function statusList(interaction, page, action, type, id) {

    const linesByPage = 10;

    const answer = async (content) => {
        return await interaction.reply({
            content: content,
            flags: MessageFlags.Ephemeral
        });
    };

    const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

    if(!member || !member.village_tag) return await answer(`You are not in a village`);

    let statusQuery = `SELECT member_id, member_name, status, reason FROM status WHERE village_tag = ? `;
    const binds = [member.village_tag];

    if(type == "warn" || type == "ban") {
        statusQuery += `AND status = ? `;
        binds.push(type);
    }

    if(id != null) {
        statusQuery += `AND member_id = ? `;
        binds.push(id);
    }

    statusQuery += `ORDER BY date DESC`;

    const statusList = await db.getall(statusQuery, binds);

    if(statusList.length == 0) return await answer(`There is no ban/warn`);

    page = parseInt(page);
    if(action == "p") page--;
    else page++;

    // Stay in the list bounds
    const lastPage = Math.ceil(statusList.length / linesByPage) - 1;
    page = Math.min(Math.max(page, 0), lastPage);

    const start = page * linesByPage;
    const limit = Math.min(start + linesByPage, statusList.length);

    let status = "";
    let nameId = "";
    let reason = "";

    for(let i = start; i < limit; i++) {
        nameId += `${statusList[i].member_name}(${statusList[i].member_id})\n`;
        status += `${statusList[i].status}\n`;
        reason += `${statusList[i].reason ? statusList[i].reason : "-"}\n`;
    }

    const embed = new EmbedBuilder()
    .setTitle(`Village bans and warns`)
    .setColor(globals.embed.black)
    .setFooter({ text: `Page ${page + 1}/${lastPage + 1}` })
    .addFields(
        { name: `Name / ID`, value: `${nameId}`.slice(0, 1024), inline: true },
        { name: `Type`, value: `${status}`.slice(0, 1024), inline: true },
        { name: `Reason`, value: `${reason}`.slice(0, 1024), inline: true }
    );

    const previous = new ButtonBuilder()
    .setLabel(`Previous`)
    .setStyle(ButtonStyle.Secondary)
    .setCustomId(`stList${globals.separator}p${globals.separator}${page}${globals.separator}${type}${globals.separator}${id}`)
    .setDisabled(page == 0);

    const next = new ButtonBuilder()
    .setLabel(`Next`)
    .setStyle(ButtonStyle.Secondary)
    .setCustomId(`stList${globals.separator}n${globals.separator}${page}${globals.separator}${type}${globals.separator}${id}`)
    .setDisabled(page >= lastPage);

    const row = new ActionRowBuilder()
    .addComponents(previous, next);

    if(interaction.isButton()) {
        // Edit the list message
        return await interaction.update({
            content: ``,
            embeds: [embed],
            components: [row]
        });
    }

    // Send the list message
    await interaction.channel.send({
        embeds: [embed],
        components: [row]
    });

    return await answer(`ok`);
}

export const lists = { statusList };
