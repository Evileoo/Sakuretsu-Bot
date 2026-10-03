import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            ninja: buttonData[1]
        }

        const ninjaEffects = await db.getrow(`SELECT effect_list, \`long\` FROM ninjas WHERE \`short\` = ?`, [data.ninja]);
        const list = ninjaEffects.effect_list.split(",");

        const effects = await db.getall(`SELECT * FROM effect WHERE id IN (${list.map(() => '?').join(',')}) ORDER BY type`, list);

        const embed = new EmbedBuilder()
        .setTitle(`${ninjaEffects.long}'s effects`)
        .setColor(globals.embed.white);

        let lastType = null, text = "";

        for (const effect of effects) {
            if (effect.type != lastType) {
                if (lastType != null) embed.addFields({ name: `${lastType}`, value: text });
                lastType = effect.type;
                text = "";
            }
            text += `**${effect.name}** : ${effect.description}\n`;
        }
        if (lastType !== null) embed.addFields({ name: `${lastType}`, value: text });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}