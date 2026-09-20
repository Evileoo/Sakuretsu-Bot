import { ActionRowBuilder, BaseGuildVoiceChannel, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            page: parseInt(buttonData[1]),
            type: buttonData[2]
        }

        const embed = new EmbedBuilder()
        .setTitle(`Blood Clash helper`)
        .setTimestamp()

        const next = new ButtonBuilder()
        .setCustomId(`howToHelp${globals.separator}${data.page+1}${globals.separator}u`)
        .setLabel(`Next`)
        .setStyle(ButtonStyle.Success)

        const previous = new ButtonBuilder()
        .setCustomId(`howToHelp${globals.separator}${data.page-1}${globals.separator}u`)
        .setLabel(`Previous`)
        .setStyle(ButtonStyle.Danger)

        switch(data.page) {
            case 1:
                previous.setDisabled(true);
                embed.setDescription(`## Summary\n- Page 1 : summary\n- Page 2 : Automated management\n- Page 3 : Manage help requests\n- Page 4 : Blacklist and whitelist\n- Page 5 : Opened lobby\n\nClick on *previous* and *next* buttons to navigate through pages\n\nNB : Every message sent here will be instantly deleted, but commands you enter will be executed`);
            break;
            case 2:
                embed.setDescription(`## Automated management\nYou can automate stuff so it can help you with what to do. Here are the sentences to type so you can ease the automation of your lobbies :\n- \`max floor 1499\` -> will allow you to setup a max floor you can reach, so you can't take requests who start from same floor or above\n- \`id 123\` -> on channel create, it will send your ingame ID to members so they can add you (replace 123 by your id)`);
            break;
            case 3:
                embed.setDescription(`## Manage help requests\n- help 4 -> (where for is the ID written in the list), opens a help lobby or adds the player in the existing one\n- cancel 4 -> Cancel the help (in case he didn't answer or else), it will put the player back in the pool at the same floor\n- finish 4 1550 -> when the push is done, indicate the floor you stopped at\n\nNB : All these commands can be executed in your lobby channel if you have one open.`);
            break;
            case 4:
                embed.setDescription(`## Blacklist and whitelist\nWill help you define who you don't want to help. If you try to help someone you blacklisted you will be blocked and will need to whitelist him back.\n- blacklist 4 -> (4 is the ID of the request) will blacklist the player on your side, you won't be able to help him anymore\n- whitelist 4 -> whitelist a player you previously blacklisted, so you can help him back\n\n NB : All these commands can be executed in your lobby channel if you have one open.`);
            break;
            case 5:
                next.setDisabled(true);
                embed.setDescription(`## Opened lobby\nAllow you to create a lobby without accepting to help someone.\nIt will send a message in <#${globals.server.channel.bloodClash}> requesting member to join.\n- lobby open -> creates a public lobby\n- lobby close -> turn a public lobby into private\n- lobby floor 1500 -> edit the max floor for this lobby only\n- lobby finish 1500 -> deletes the lobby and update the current floor of every member in it to the given floor.\n- lobby cancel -> deletes the lobby without editing the floor of members in it`);
            break;
        }

        const row = new ActionRowBuilder()
        .addComponents(previous, next);

        if(data.type == "s") {
            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        }

    }
}