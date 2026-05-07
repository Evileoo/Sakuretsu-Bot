import {  } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){
        
        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        // Get the member
        const query = `SELECT DISTINCT event_name from events WHERE event_name LIKE '${input}' LIMIT 25`;
        const result = await db.query(query);

        // Display the leagues
        await interaction.respond(result.map(choice => ({ name: `${choice.event_name}`, value: choice.event_name })));
    }
}