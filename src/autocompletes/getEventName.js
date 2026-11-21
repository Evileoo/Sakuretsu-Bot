import { db } from '../connections/database.js';

export const autocomplete = {
    async execute(interaction){

        // Get the content of the focused input field
        const input = `%${interaction.options.getFocused()}%`;

        const result = await db.getall(`SELECT DISTINCT event_name FROM events WHERE event_name LIKE ? LIMIT 25`, [input]);

        await interaction.respond(result.map(choice => ({ name: `${choice.event_name}`.slice(0, 100), value: `${choice.event_name}`.slice(0, 100) })));
    }
}
