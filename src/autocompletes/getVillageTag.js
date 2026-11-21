import { db } from '../connections/database.js';

export const autocomplete = {
    async execute(interaction){

        // Get the content of the focused input field
        const input = `%${interaction.options.getFocused()}%`;

        const result = await db.getall(`SELECT DISTINCT name, tag FROM village WHERE name LIKE ? OR tag LIKE ? LIMIT 25`, [input, input]);

        await interaction.respond(result.map(choice => ({ name: `[${choice.tag}] ${choice.name}`.slice(0, 100), value: `${choice.tag}` })));
    }
}
