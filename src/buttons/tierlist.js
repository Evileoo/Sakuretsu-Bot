import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, LabelBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            page: buttonData[1],
            type: buttonData[2]
        }

        if(data.page == "1") {
            const embed = new EmbedBuilder()
            .setTitle(`Tierlist guide`)
            .setDescription(`You can create 3 types of tierlists :\n- global\n- PvP\n- PvE\nTo create your tierlist click on one of the corresponding buttons.\nNote: If you create your global tierlist before doing others, it will load the PvE and PvP ones with your global one, so your don't have to rewrite everything again.\n\n**How to fill the tierlist**\nYou will need to type the exact in game ninja name to add a ninja to your tierlist, or type the shortened name known by the bot. (those are available when clicking "short names" button)\nThe position of ninjas you give in the tierlist matters, the first will be better ranked than the 2nd, in each tier.\n__For your tierlist to be taken in account, type the ninja name, go to the line, then type an other name__.\nIf the ninja has an awaken, you can type it's name, then put T2 or T5 after it if it changes it's position in the tierlist\n\n**Ninja tiers**\n- G tier : best ninja, only 1 ninja allowed\n- S tier : best ninjas of the game\n- A tier : good ninjas\n- B tier : meh ninjas\n- C tier : Bad ninjas\nIf you don't know in which tier a ninja goes, just don't type it.\n\nOnce your tierlist will be ready, it will update the tierlist based on your tierlist and all other players ones.\n\n**Example of how to type in 1 of the tiers**\n\`\`\`Hashirama Senju\nObito\nPain Tendo T5\nKakashi T2\nTsunade\`\`\``)
        
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

            const content = await db.getrow(`SELECT * FROM tierlist WHERE id = ? AND type = ?`, [interaction.user.id, parseInt(data.type)]);

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