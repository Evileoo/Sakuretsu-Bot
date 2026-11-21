import { db } from '../connections/database.js';

// Registration lists of the village of the member (/village list edit|remove|delete)
export const autocomplete = {
    async execute(interaction){

        const input = `%${interaction.options.getFocused()}%`;
        const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
        if(!executor?.village_tag) return await interaction.respond([]);

        const lists = await db.getall(
            `SELECT l.id, l.title, l.slots, l.closed, COUNT(m.id) AS amount FROM village_list l LEFT JOIN village_list_member m ON m.list_id = l.id WHERE l.village_tag = ? AND l.title LIKE ? GROUP BY l.id ORDER BY l.date DESC LIMIT 25`,
            [executor.village_tag, input]
        );

        await interaction.respond(lists.map(l => ({
            name: `${l.title} (${l.amount}${l.slots != null ? `/${l.slots}` : ``}${l.closed ? `, closed` : ``})`.slice(0, 100),
            value: `${l.id}`
        })));
    }
}
