import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { bloodclash } from '../functions/bloodclash.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            id: buttonData[2]
        }

        switch(data.action) {
            case "join":
                await join(interaction, data.id)
            break;
            case "list":
                await bloodclash.cluster(interaction, data.id, false);
            break;
        }

        async function join(interaction, id) {
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            await db.update(`UPDATE village SET cluster_id = ? WHERE tag = ?`, [id, member.village_tag]);

            await interaction.update({
                content: `Cluster updated`,
                embeds: [],
                components: [],
                flags: MessageFlags.Ephemeral
            });
        }

    }
}