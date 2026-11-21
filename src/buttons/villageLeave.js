import { EmbedBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageFlow } from '../functions/villageFlow.js';
import { villageMembership } from '../functions/villageMembership.js';
import { nameUpdates } from '../functions/nameUpdates.js';

// Confirmation buttons of "/my village leave"
export const button = {
    async execute(interaction, buttonData){

        const data = {
            choice: buttonData[1],
            tag: buttonData[2]
        }

        if(data.choice != "y") {
            return await interaction.update({
                content: `You stay in the village`,
                components: []
            });
        }

        const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
        const village = await db.getrow(`SELECT * FROM village WHERE tag = ?`, [data.tag]);

        if(!member || member.village_tag != data.tag || !village) {
            return await interaction.update({
                content: `You are not in this village anymore`,
                components: []
            });
        }

        const guildMember = interaction.member;
        const wasKage = guildMember.roles.cache.has(globals.server.role.kage);

        await interaction.update({
            content: `You left **[${village.tag}] ${village.name}**`,
            components: []
        });

        // Roles, database and name
        await guildMember.roles.remove(village.role_id);
        await guildMember.roles.add(globals.server.role.lone);
        await villageFlow.removeVillageRanks(interaction.guild, guildMember, village);

        await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [interaction.user.id]);
        await nameUpdates.updateName(interaction.user.id, interaction.guild);

        // Flow messages
        const leaveEmbed = new EmbedBuilder()
        .setTitle(`Member left`)
        .setDescription(`<@${interaction.user.id}> has left the village`)
        .setColor(globals.embed.orange)
        .setTimestamp();

        await villageFlow.sendLog(interaction.guild, village, village.flow_leave, { embeds: [leaveEmbed] });

        if(wasKage) {
            const successor = await villageMembership.promoteSuccessor(interaction.guild, village, interaction.user.id);

            const kageEmbed = new EmbedBuilder()
            .setTitle(successor ? `New Kage` : `No Kage anymore`)
            .setDescription(successor
                ? `<@${interaction.user.id}> left the village, <@${successor.id}> is the new Kage`
                : `<@${interaction.user.id}> left the village and there is no BroKage to replace him. A moderator can name a new Kage`)
            .setColor(successor ? globals.embed.green : globals.embed.red)
            .setTimestamp();

            await villageFlow.sendLog(interaction.guild, village, village.flow_promote, { embeds: [kageEmbed] });
        }
    }
}
