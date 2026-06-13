import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { lists } from '../functions/lists.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            event: buttonData[1],
            status: buttonData[2]
        }

        const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

        const newStatus = data.status == 0 ? 1 : 0;

        switch(data.event) {
            case "i":
                await db.update(`UPDATE village SET flow_incoming = ? WHERE tag = ?`, [newStatus, member.village_tag]);
            break;
            case "l":
                await db.update(`UPDATE village SET flow_leave = ? WHERE tag = ?`, [newStatus, member.village_tag]);
            break;
            case "w":
                await db.update(`UPDATE village SET flow_warn = ? WHERE tag = ?`, [newStatus, member.village_tag]);
            break;
            case "b":
                await db.update(`UPDATE village SET flow_ban = ? WHERE tag = ?`, [newStatus, member.village_tag]);
            break;
            case "s":
                await db.update(`UPDATE village SET flow_promote = ? WHERE tag = ?`, [newStatus, member.village_tag]);
            break;
        }

        const village = await db.getrow(`SELECT flow_incoming, flow_leave, flow_warn, flow_ban, flow_promote FROM village WHERE tag = ?`, [member.village_tag]);

        const newMember = new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}i${globals.separator}${village.flow_incoming}`)
        .setLabel(`New member`)
        .setStyle(village.flow_incoming == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const byeMember = new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}l${globals.separator}${village.flow_leave}`)
        .setLabel(`Member leave`)
        .setStyle(village.flow_leave == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const warnMember = new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}w${globals.separator}${village.flow_warn}`)
        .setLabel(`Member warned`)
        .setStyle(village.flow_warn == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const banMember = new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}b${globals.separator}${village.flow_ban}`)
        .setLabel(`Member banned`)
        .setStyle(village.flow_ban == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const subMember = new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}s${globals.separator}${village.flow_promote}`)
        .setLabel(`Member promoted/demoted`)
        .setStyle(village.flow_promote == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const row = new ActionRowBuilder()
        .addComponents(newMember, byeMember, warnMember, banMember, subMember);

        await interaction.message.edit({
            components: [row]
        });

        await interaction.deferUpdate();

    }
}