import { db } from '../connections/database.js';

// Villages the moderator is visiting (/mod village leave)
export const autocomplete = {
    async execute(interaction){

        const input = `%${interaction.options.getFocused()}%`;

        const result = await db.getall(
            `SELECT v.tag, v.name FROM village_visit vv JOIN village v ON v.tag = vv.village_tag WHERE vv.member_id = ? AND (v.name LIKE ? OR v.tag LIKE ?) ORDER BY v.tag LIMIT 25`,
            [interaction.user.id, input, input]
        );

        await interaction.respond(result.map(choice => ({ name: `[${choice.tag}] ${choice.name}`.slice(0, 100), value: `${choice.tag}` })));
    }
}
