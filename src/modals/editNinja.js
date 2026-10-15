import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';

export const modal = {
    async execute(interaction, modalData){
        const data = {
            type: modalData[1],
            name: modalData[2]
        }

        switch(data.type) {
            case "a":
                await db.update(`UPDATE ninjas SET awakenT2 = ?, awakenT5 = ? WHERE short = ?`, [
                    interaction.fields.getTextInputValue("awakenT2"),
                    interaction.fields.getTextInputValue("awakenT5"),
                    data.name
                ]);
            break;
            case "b":
                await db.update(`UPDATE ninjas SET hp = ?, atk = ?, def = ? WHERE short = ?`, [
                    interaction.fields.getTextInputValue("hp"),
                    interaction.fields.getTextInputValue("atk"),
                    interaction.fields.getTextInputValue("def"),
                    data.name
                ]);
            break;
            case "g":
                await db.update(`UPDATE ninjas SET rarity = ?, element = ?, class = ?, dmg_type = ? WHERE short = ?`, [
                    interaction.fields.getTextInputValue("rarity"),
                    interaction.fields.getTextInputValue("element"),
                    interaction.fields.getTextInputValue("class"),
                    interaction.fields.getTextInputValue("dmgType"),
                    data.name
                ]);
            break;
            case "s":
                await db.update(`UPDATE ninjas SET skill1 = ?, skill2 = ?, skill3 = ?, skill4 = ? WHERE short = ?`, [
                    interaction.fields.getTextInputValue("skill1"),
                    interaction.fields.getTextInputValue("skill2"),
                    interaction.fields.getTextInputValue("skill3"),
                    interaction.fields.getTextInputValue("skill4"),
                    data.name
                ]);
            break;
        }

        await interaction.reply({
            content: `Edited`,
            flags: MessageFlags.Ephemeral
        });
    }
}