import { MessageFlags, EmbedBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { villageFlow } from '../functions/villageFlow.js';

export const modal = {
    async execute(interaction, modalData){
        const village = await db.getrow(`SELECT rules FROM village WHERE tag = ?`, [modalData[1]]);

        if(!village) {
            return await interaction.reply({
                content: `This village doesn't exist anymore`,
                flags: MessageFlags.Ephemeral
            });
        }

        const rulesContent = interaction.fields.getTextInputValue("rulesContent").trim() || `No rules`;

        await db.update(`UPDATE village SET rules_message = ? WHERE tag = ?`, [rulesContent, modalData[1]]);

        await interaction.reply({
            content: `Rules edited`,
            flags: MessageFlags.Ephemeral
        });

        const embed = new EmbedBuilder()
        .setTitle(`Village rules`)
        .setTimestamp()
        .setDescription(rulesContent);

        const rulesChannel = await villageFlow.fetchChannel(interaction.guild, village.rules);
        if(!rulesChannel) return;

        // Edit the rules message sent by the bot, or send it again if it has been deleted
        const fetched = await rulesChannel.messages.fetch({ limit: 50 });
        const rulesMessage = fetched.filter(m => m.author.id == interaction.client.user.id).last();

        if(rulesMessage) {
            await rulesMessage.edit({ embeds: [embed] });
        } else {
            await rulesChannel.send({ embeds: [embed] });
        }
    }
}
