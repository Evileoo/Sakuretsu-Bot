import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { villageMembership } from '../functions/villageMembership.js';

export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            id: buttonData[2],
            tag: buttonData[3]
        }

        if(interaction.user.id != data.id) {
            return await interaction.reply({
                content: `Only <@${data.id}> can interact with these buttons`,
                flags: MessageFlags.Ephemeral
            });
        }

        const message = interaction.message;

        if(data.action == "d") {
            await message.delete().catch(() => null);

            return await interaction.reply({
                content: `You denied the invitation`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Checks
        const village = await db.getrow(`SELECT tag, role_id, name, flow, moderation, flow_incoming FROM village WHERE tag = ?`, [data.tag]);

        if(!village) {
            await message.delete().catch(() => null);

            return await interaction.reply({
                content: `This village doesn't exist anymore`,
                flags: MessageFlags.Ephemeral
            });
        }

        const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

        if(member && member.village_tag) {
            await message.delete().catch(() => null);

            return await interaction.reply({
                content: `You are in a village. You can't join an other`,
                flags: MessageFlags.Ephemeral
            });
        }

        if(!member) {
            await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [interaction.user.id, (interaction.member.displayName ?? interaction.user.username).slice(0, 50)]);
        }

        await interaction.deferUpdate();

        // Update message
        await message.edit({
            content: `<@${interaction.user.id}> has joined **[${village.tag}] ${village.name}**`,
            components: []
        });

        // Roles, database, name (and his pending applications are cancelled)
        await villageMembership.addToVillage(interaction.guild, interaction.member, village, `<@${interaction.user.id}> has joined the village !`);
    }
}
