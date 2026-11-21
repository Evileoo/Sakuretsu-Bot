import { EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageFlow } from '../functions/villageFlow.js';
import { villageMembership } from '../functions/villageMembership.js';

// Accept / deny button of an application, in the village moderation channel
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            id: buttonData[2]
        }

        const answer = async (content) => {
            return await interaction.reply({
                content: content,
                flags: MessageFlags.Ephemeral
            });
        };

        const closeMessage = async (status, color) => {
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(color)
            .setFooter({ text: status });

            return { embeds: [embed], components: [] };
        };

        const application = await db.getrow(`SELECT * FROM application WHERE id = ?`, [data.id]);
        if(!application) {
            await interaction.message.edit({ components: [] }).catch(() => null);
            return await answer(`This application is no longer pending`);
        }

        // Only the Kage and BroKages of the village can answer
        const answerer = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
        if(!answerer || answerer.village_tag != application.village_tag || !interaction.member.roles.cache.has(globals.server.role.sub)) {
            return await answer(`Only the Kage and BroKages of [${application.village_tag}] can answer this application`);
        }

        const village = await db.getrow(`SELECT tag, name, role_id, flow, moderation, flow_incoming FROM village WHERE tag = ?`, [application.village_tag]);
        const applicant = await villageFlow.fetchMember(interaction.guild, application.member_id);
        const answererName = interaction.member.displayName ?? interaction.user.username;

        if(data.action == "d") {
            await db.delete(`DELETE FROM application WHERE id = ?`, [application.id]);
            await interaction.update(await closeMessage(`Denied by ${answererName}`, globals.embed.red));

            if(applicant) await villageMembership.notify(applicant.user, `Your application to **[${village.tag}] ${village.name}** has been denied.`);
            return;
        }

        // Accept
        if(!applicant) {
            await db.delete(`DELETE FROM application WHERE id = ?`, [application.id]);
            return await interaction.update(await closeMessage(`Application cancelled : the member left the server`, globals.embed.grey));
        }

        const applicantData = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [application.member_id]);
        if(applicantData && applicantData.village_tag) {
            await db.delete(`DELETE FROM application WHERE id = ?`, [application.id]);
            return await interaction.update(await closeMessage(`Application cancelled : the member is already in [${applicantData.village_tag}]`, globals.embed.grey));
        }

        await db.delete(`DELETE FROM application WHERE id = ?`, [application.id]);
        await interaction.update(await closeMessage(`Accepted by ${answererName}`, globals.embed.green));

        await villageMembership.addToVillage(interaction.guild, applicant, village, `<@${applicant.id}> has joined the village !\naccepted by <@${interaction.user.id}>`);

        await villageMembership.notify(applicant.user, `Your application to **[${village.tag}] ${village.name}** has been accepted, welcome in the village !`);
    }
}
