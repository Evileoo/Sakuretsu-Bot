import { db } from '../connections/database.js';

export const autocomplete = {
    async execute(interaction){

        // Get the content of the focused input field
        const input = `%${interaction.options.getFocused()}%`;

        // Only show sanctions of the executor's village
        const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
        if(!executor || !executor.village_tag) return await interaction.respond([]);

        const result = await db.getall(
            `SELECT DISTINCT member_id, member_name FROM status WHERE village_tag = ? AND (member_id LIKE ? OR member_name LIKE ?) LIMIT 25`,
            [executor.village_tag, input, input]
        );

        await interaction.respond(result.map(choice => ({ name: `${choice.member_name} (${choice.member_id})`.slice(0, 100), value: `${choice.member_id}` })));
    }
}
