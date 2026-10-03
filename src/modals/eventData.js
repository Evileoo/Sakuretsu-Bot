import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const modal = {
    async execute(interaction, modalData){
        await db.update(`UPDATE events SET event_data = ? WHERE id = ?`, [interaction.fields.getTextInputValue("dataContent"), modalData[1]]);
        
        await interaction.reply({
            content: `Event edited`,
            flags: MessageFlags.Ephemeral
        });
    }
}