import { MessageFlags, EmbedBuilder } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const modal = {
    async execute(interaction, modalData){
        const village = await db.getrow(`SELECT rules FROM village WHERE tag = ?`, [modalData[1]]);
        await db.update(`UPDATE village SET rules_message = ? WHERE tag = ?`, [interaction.fields.getTextInputValue("rulesContent"), modalData[1]]);
        
        await interaction.reply({
            content: `Rules edited`,
            flags: MessageFlags.Ephemeral
        });

        const embed = new EmbedBuilder()
        .setTitle(`Village rules`)
        .setTimestamp()
        .setDescription(`${interaction.fields.getTextInputValue("rulesContent")}`);

        const rulesChannel = await interaction.guild.channels.cache.get(village.rules);
        const fetched = await rulesChannel.messages.fetch({ limit:1 });
        await fetched.last().edit({
            embeds: [embed]
        });
    }
}