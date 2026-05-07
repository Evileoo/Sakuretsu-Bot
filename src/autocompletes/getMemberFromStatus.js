import {  } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){
        
        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        // Get the member
        const query = `SELECT member_id, member_name from status WHERE member_id LIKE '${input}' OR member_name LIKE '${input}' LIMIT 25`;
        const result = await db.query(query);

        // Display the leagues
        await interaction.respond(result.map(choice => ({ name: `${choice.member_name} (${choice.member_id})`, value: choice.member_id })));
    }
}