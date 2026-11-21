import { PermissionsBitField } from 'discord.js';
import { db } from '../connections/database.js';

// Tri-Army Clash channels the member can delete: created by his village, or all of them for moderators
export const autocomplete = {
    async execute(interaction){

        const input = interaction.options.getFocused().toLowerCase();
        const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers);
        const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

        const channels = await db.getall(
            `SELECT t.id, GROUP_CONCAT(v.village_tag ORDER BY v.village_tag SEPARATOR ' ') AS tags FROM tac_channel t LEFT JOIN tac_village v ON v.channel_id = t.id WHERE ? OR t.creator_tag = ? GROUP BY t.id ORDER BY t.date DESC`,
            [isModerator, executor?.village_tag ?? null]
        );

        const choices = channels
        .map(c => ({ name: `#${interaction.guild.channels.cache.get(c.id)?.name ?? `deleted-channel`} (${c.tags ?? ``})`.slice(0, 100), value: c.id }))
        .filter(c => c.name.toLowerCase().includes(input))
        .slice(0, 25);

        await interaction.respond(choices);
    }
}
