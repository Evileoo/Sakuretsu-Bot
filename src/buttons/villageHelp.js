import { MessageFlags, ChannelType, Embed, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, ButtonComponent, EmbedBuilder } from 'discord.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1]
        }

        const embed = new EmbedBuilder()
        .setTitle(`Helper`)
        .setTimestamp()
        .setColor(globals.embed.yellow)

        const renameButton = new ButtonBuilder()
        .setCustomId(`villageHelp${globals.separator}n`)
        .setLabel(`rename`)
        .setStyle(ButtonStyle.Secondary);

        const subkageButton = new ButtonBuilder()
        .setCustomId(`villageHelp${globals.separator}s`)
        .setLabel(`subkage`)
        .setStyle(ButtonStyle.Secondary);

        const inviteButton = new ButtonBuilder()
        .setCustomId(`villageHelp${globals.separator}i`)
        .setLabel(`invite`)
        .setStyle(ButtonStyle.Secondary);

        const rulesButton = new ButtonBuilder()
        .setCustomId(`villageHelp${globals.separator}r`)
        .setLabel(`rules`)
        .setStyle(ButtonStyle.Secondary);

        const recolorButton = new ButtonBuilder()
        .setCustomId(`villageHelp${globals.separator}c`)
        .setLabel(`recolor`)
        .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
        .addComponents(renameButton, subkageButton, inviteButton, rulesButton, recolorButton);

        switch(data.action) {
            case "n":
                embed.setDescription(`This command is used to rename the village. It has the same rules as in game, the village tag is unique, so keep the same name as in game\n\n**Parameters:**\n- tag: the new village tag\n- name: the new village name`);
                renameButton.setDisabled(true);
            break;
            case "s":
                embed.setDescription(`This command will add or remove a sub kage.\nIf the member is not sub kage, it will promote him, otherwise, it will demote him to member\n\n**Parameters:**\n- member: the discord user you want to promote/demote`);
                subkageButton.setDisabled(true);
            break;
            case "i":
                embed.setDescription(`Use this command to invite someone who's not in a village.\nIt will send a join request dedicated to the user your chose in <#${globals.server.channel.villages}>\n\n**Parameters:**\n- member: the discord user you want to invite`);
                inviteButton.setDisabled(true);
            break;
            case "r":
                embed.setDescription(`Edit village's rules.\nThe command will open a box where you can edit the rules.`);
                rulesButton.setDisabled(true);
            break;
            case "c":
                embed.setDescription(`This command will allow you to change the village role color.\nYou will need to provide the *hexadecimal code* of the color you want. You can pick up one [here](https://www.htmlcsscolor.com/). Be sure to take the *#* and all 6 characters behind\n\n**Parameters:**\n- color: the hexadecimal value of the role color you want\n- second: useless for now`);
                rulesButton.setDisabled(true);
            break;
        }

        await interaction.update({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });

    }
}