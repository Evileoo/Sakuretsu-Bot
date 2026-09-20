import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const modal = {
    async execute(interaction, modalData){
        await db.update(`UPDATE notebook SET content = ? WHERE id = ? AND name = ?`, [interaction.fields.getTextInputValue("nbModContent"), interaction.user.id, modalData[1]]);
        await db.update(`UPDATE events SET event_data = ? WHERE id = ?`, [interaction.fields.getTextInputValue("dataContent"), modalData[1]]);
        
        await interaction.reply({
            content: `notebook saved`,
            flags: MessageFlags.Ephemeral
        });
    }
}