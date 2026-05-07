import { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, MessageFlags, ButtonComponent } from 'discord.js';

async function sendMessage(data, interaction) {

    const category = data.category;
    const messageId = data.messageId;
    const type = data.messageType;


    // Prepare embed
    let message;
    
    switch(category) {
        case "schedule":
            message = await getScheduleMessage(messageId);
        break;
        default:
        break;
    }

    switch(type) {
        case "reply":
            return await interaction.reply(message);
        case "update":
            return await interaction.update(message);
    }
}

async function getScheduleMessage(id) {
    const embed = new EmbedBuilder();
    const buttons = new ActionRowBuilder();
    const previous = new ButtonBuilder();
    const next = new ButtonBuilder();

    const fileName = "scheduleSetup";

    switch(id) {
        case "1":
            embed
            .setTitle(`Schedule setup`)
            .setFooter({ text: `Page 1/3` })
            .setDescription(`Welcome to the schedule setup. This functionnality will help everyone in the server to know if you are here or not, and when you will be online.\nThe setup will take maximum 5 minutes.\n\nFirst of all, if you don't know your UTC timezone, open a google page and type the name of your country (or state or city) and \`UTC timezone\`.\nYour navigator should display you something like this: UTC+6 (where 6 is a random number).\nKeep in mind the number and the + or -.\n\nOnce you're done, click on *next*`);
        
            previous
            .setCustomId(`${fileName}|||1`)
            .setLabel(`Previous`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true);

            next
            .setCustomId(`${fileName}|||2`)
            .setLabel(`Next`)
            .setStyle(ButtonStyle.Primary);

            buttons
            .addComponents(previous, next);
        break;
        case "2":
            embed
            .setTitle(`Schedule setup`)
            .setFooter({ text: `Page 2/3` })
            .setDescription(`Now I will need to get some basic data about you:\n1. Your ingame name\n2. Your timezone\n\nTo send me these informations, execute the command \`/schedule define\` and fill the parameters.\n\nNOTE: For the timezone, use this format \`+02\` or \`-11\` (the sign of your timezone and the number written with 2 digits)\n\nOnce you finish this, you can jump to the next step`);
        
            previous
            .setCustomId(`${fileName}|||1`)
            .setLabel(`Previous`)
            .setStyle(ButtonStyle.Danger);

            next
            .setCustomId(`${fileName}|||3`)
            .setLabel(`Next`)
            .setStyle(ButtonStyle.Primary);

            buttons
            .addComponents(previous, next);
        break;
        case "3":
            embed
            .setTitle(`Schedule setup`)
            .setFooter({ text: `Page 3/3` })
            .setDescription(`Aaaaaand the annoying part. It's a bit more complex here so follow well the setup.\nKeep it mind that, by default, for the bot, you are never available, so you have to only give the time when you're available.\n\nExecute the command \`/schedule edit\`\nIt needs 2 parameters\n1. The first parameters is about the day (or days) to give your availibilities. You can set it up day by day, or for split it into week days and week end, or just the full week. NOTE: When you edit a day a second time, it will erase the previously entered data and rewrite it.\n2. The second parameter is about the time of the day you are available. write it like this: \`HH:MM HH:MM\` where *HH* is the hour (on 2 digits) and *MM* the minute (on 2 digits too). If somehow you have a time of the day where you're available at 2 times of the day, write it like this \`HH:MM HH:MM, HH:MM HH:MM\`, this setup is useful especially if you are available on mornings and evenings, before and after your work/school day\n\nOnce you're done with this, execute the command \`/schedule display\` to ensure everything is good and re use the edit command if something is wrong.`);
        
            previous
            .setCustomId(`${fileName}|||2`)
            .setLabel(`Previous`)
            .setStyle(ButtonStyle.Danger);

            next
            .setCustomId(`${fileName}|||3`)
            .setLabel(`Next`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

            buttons
            .addComponents(previous, next);
        break;
    }

    return {
        embeds: [embed],
        components: [buttons],
        flags: MessageFlags.Ephemeral
    }
}

export const messageContent = {sendMessage};