import {  } from 'discord.js';
import { db } from '../connections/database.js';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){
        
        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        // Get the member
        const query = `SELECT DISTINCT name, id FROM notebook WHERE name LIKE '${input}' OR id = '${interaction.user.id}' LIMIT 25`;
        const result = await db.getall(query);

        for(let i = 0; i < result.length; i++) {
            result[i].username = (await interaction.guild.members.fetch(result[i].id)).user.username;
        }

        // Display the leagues
        await interaction.respond(result.map(choice => ({ name: `${choice.name} - ${choice.username}`, value: `${choice.name}|||${choice.id}` })));
    }
}