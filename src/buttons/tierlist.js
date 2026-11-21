import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, LabelBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { docs } from '../functions/docs.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            page: buttonData[1],
            type: buttonData[2]
        }

        if(data.page == "1") {
            const embed = new EmbedBuilder()
            .setTitle(`Your tierlist`)
            .setDescription(`Pick the tierlist you want to fill : **Global**, **PvE** or **PvP**.\nHow it works : ${docs.mention(`tierlist`)}`);

            const shortNames = new ButtonBuilder()
            .setCustomId(`tierlist${globals.separator}2`)
            .setLabel(`Short Names`)
            .setStyle(ButtonStyle.Secondary);
        
            const globalTierlist = new ButtonBuilder()
            .setCustomId(`tierlist${globals.separator}3${globals.separator}0`)
            .setLabel(`Global`)
            .setStyle(ButtonStyle.Success);
        
            const PvE = new ButtonBuilder()
            .setCustomId(`tierlist${globals.separator}3${globals.separator}1`)
            .setLabel(`PvE`)
            .setStyle(ButtonStyle.Primary);
        
            const PvP = new ButtonBuilder()
            .setCustomId(`tierlist${globals.separator}3${globals.separator}2`)
            .setLabel(`PvP`)
            .setStyle(ButtonStyle.Primary);
        
            const row = new ActionRowBuilder()
            .addComponents(shortNames, globalTierlist, PvE, PvP);

            const guideUrl = docs.url(`tierlist`);
            if(guideUrl) row.addComponents(new ButtonBuilder().setLabel(`How it works`).setStyle(ButtonStyle.Link).setURL(guideUrl));

            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });

        } else if(data.page == "2"){
            const embed = new EmbedBuilder()
            .setTitle(`Ninjas short names`);

            const ninjas = await db.getall(`SELECT short, \`long\` FROM ninjas ORDER BY short`);
            let description = "";

            for(const ninja of ninjas) {
                description += `[${ninja.short}] ${ninja.long}\n`;
            }

            embed.setDescription(description);

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        } else {

            // The PvE and PvP tierlists start from the global one when they are empty
            const content = await db.getrow(`SELECT * FROM tierlist WHERE id = ? AND type = ?`, [interaction.user.id, parseInt(data.type)])
                ?? (data.type != "0" ? await db.getrow(`SELECT * FROM tierlist WHERE id = ? AND type = 0`, [interaction.user.id]) : null);

            const modal = new ModalBuilder()
            .setCustomId(`tierlist${globals.separator}${data.type}`)
            
            if(data.type == "0") modal.setTitle(`Global Tierlist`);
            else if(data.type == "1") modal.setTitle(`PvE Tierlist`);
            else modal.setTitle(`PvP Tierlist`);

            const gTierInput = new TextInputBuilder()
            .setCustomId(`gTierInput`)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100)
            .setRequired(false)
            .setValue((content?.g_tier) ? content.g_tier : " ");

            const gTierLabel = new LabelBuilder()
            .setLabel(`G Tier ninja`)
            .setDescription(`Best ninja of the game`)
            .setTextInputComponent(gTierInput);


            const sTierInput = new TextInputBuilder()
            .setCustomId(`sTierInput`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(false)
            .setValue((content?.s_tier) ? content.s_tier : " ");

            const sTierLabel = new LabelBuilder()
            .setLabel(`S Tier ninjas`)
            .setDescription(`Some of best ninjas of the game`)
            .setTextInputComponent(sTierInput);


            const aTierInput = new TextInputBuilder()
            .setCustomId(`aTierInput`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(false)
            .setValue((content?.a_tier) ? content.a_tier : " ");

            const aTierLabel = new LabelBuilder()
            .setLabel(`A Tier ninjas`)
            .setDescription(`Good ninjas`)
            .setTextInputComponent(aTierInput);


            const bTierInput = new TextInputBuilder()
            .setCustomId(`bTierInput`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(false)
            .setValue((content?.b_tier) ? content.b_tier : " ");

            const bTierLabel = new LabelBuilder()
            .setLabel(`B Tier ninjas`)
            .setDescription(`Mid ninjas`)
            .setTextInputComponent(bTierInput);


            const cTierInput = new TextInputBuilder()
            .setCustomId(`cTierInput`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(false)
            .setValue((content?.c_tier) ? content.c_tier : " ");

            const cTierLabel = new LabelBuilder()
            .setLabel(`C Tier ninjas`)
            .setDescription(`Bad ninjas`)
            .setTextInputComponent(cTierInput);


            modal.addLabelComponents(gTierLabel, sTierLabel, aTierLabel, bTierLabel, cTierLabel);

            await interaction.showModal(modal);
        }

    }
}