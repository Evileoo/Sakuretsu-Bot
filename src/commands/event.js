import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, TextInputStyle } from 'discord.js';
import { db } from '../connections/database.js';
import { mb } from '../functions/missionBoard.js';
import fs, { glob } from 'fs';
import https from 'https';
import { globals } from '../globals.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Manage events")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.CreateEvents)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add an event to the bot")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Event name")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("parent_name")
            .setDescription("The category or group ID of this event")
            .setRequired(true)
            .addChoices(
                { name: 'Blood Clash', value: 'Blood Clash' },
                { name: 'Calendar Events', value: 'Calendar Events' },
                { name: 'PvP Events', value: 'PvP Events' },
                { name: 'Ninja War Events', value: 'Ninja War Events' },
                { name: 'Exceptional Events', value: 'Exceptional Events' },
                { name: 'Daily Events', value: 'Daily Events' },
            )
        )
        .addStringOption( (option) =>
            option
            .setName("date")
            .setDescription("Start date format : YYYY-MM-DD HH:MM:SS (ingame date)")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("end_date")
            .setDescription("End date format : YYYY-MM-DD HH:MM:SS (ingame date)")
            .setRequired(false)
        )
        .addStringOption(option =>
            option
            .setName("periodicity")
            .setDescription("place as '*' if it doesn't matter, format: Y M D H M S")
            .setRequired(false)
        )
        .addRoleOption(option =>
            option
            .setName("role")
            .setDescription("the role who will receive a notification")
            .setRequired(false)
        )
        .addStringOption(option =>
            option
            .setName("data")
            .setDescription("Custom data of the event")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("remove an event from the board")
        .addStringOption( (option) =>
            option
            .setName("event")
            .setDescription("Event name / time, pick from autocompletes")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("calendar")
        .setDescription("Upload the ingame calendar")
        .addAttachmentOption( (option) =>
            option
            .setName("image")
            .setDescription("Screenshot of the ingame calendar")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("data")
        .setDescription("Update data of an event")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Event name")
            .setRequired(false)
            .setAutocomplete(true)
        )
    )
    , async execute(interaction){

        // Get all command data
        const eventAdd = (interaction.options.getSubcommand() != "add") ? null : {
            name: interaction.options.getString("name") ?? null,
            parentName: interaction.options.getString("parent_name") ?? null,
            date: interaction.options.getString("date") ?? null,
            endDate: interaction.options.getString("end_date") ?? null,
            periodicity: interaction.options.getString("periodicity") ?? null,
            role: interaction.options.getRole("role") ? `<@&${interaction.options.getRole("role").id}>` : null,
            data: interaction.options.getString("data") ?? null
        };

        const eventRemove = (interaction.options.getSubcommand() != "remove") ? null : {
            event: interaction.options.getString("event") ?? null
        };

        const eventCalendar = (interaction.options.getSubcommand() != "calendar") ? null : {
            calendar: interaction.options.getAttachment("image") ?? null
        };

        const eventData = (interaction.options.getSubcommand() != "data") ? null : {
            name: interaction.options.getString("name") ?? null
        };

        // Get guild and channel objects
        const guild = await interaction.client.guilds.cache.get(globals.server.id);
        //const channel = await guild.channels.cache.get(globals.server.channel.missionBoard);
        const channel = await guild.channels.cache.get("1485202060973576212");

        switch(interaction.options.getSubcommand()){
            case "add":
                await addEvent(eventAdd);

                await mb.editPanel(channel, "edit");

                await interaction.reply({
                    content: `Event added`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "remove":
                await removeEvent(eventRemove);

                await mb.editPanel(channel, "edit");

                await interaction.reply({
                    content: `Event removed`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "calendar":
                await getCalendar(eventCalendar);

                await mb.editPanel(channel, "edit");

                await interaction.reply({
                    content: `Image uploaded`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "data":
                await editData(eventData, interaction);

                await mb.editPanel(channel, "edit");
            break;
            default:
            break;
        }
    }
}

async function addEvent(data){
    await db.insert(
        'INSERT INTO events (event_name, event_parent_name, event_time_start, event_time_end, event_frequency, role_to_ping, event_data) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [data.name, data.parentName, data.date, data.endDate, data.periodicity, data.role, data.data]
    );
}


async function removeEvent(data){
    await db.delete('DELETE FROM events WHERE event_name = ?', [data.event]);
}

async function getCalendar(data){

    try {
        https.get(data.calendar.attachment, (res) => {
            const fileStream = fs.createWriteStream("data/calendar.png");
            res.pipe(fileStream);

            fileStream.on("finish", () => {
                fileStream.close();
            });
        });
    } catch (error) {
        console.log(error);
    }
    

    
}

async function editData(data, interaction) {
    const eventData = await db.getrow(`SELECT * FROM events WHERE event_name = ?`, [data.name]);

    if(!eventData) {
        return await interaction.reply({
            content : `event unkown`
        });
    }

    const modal = new ModalBuilder()
    .setCustomId(`eventData${globals.separator}${eventData.id}`)
    .setTitle(`Event Data`);

    const input = new TextInputBuilder()
    .setCustomId(`dataContent`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(255)
    .setValue(eventData.event_data);

    const label = new LabelBuilder()
    .setLabel(`data`)
    .setDescription(`data saved`)
    .setTextInputComponent(input)

    modal.addLabelComponents(label);

    await interaction.showModal(modal);
}