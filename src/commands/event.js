import { SlashCommandBuilder, PermissionsBitField, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { mb } from '../functions/missionBoard.js';
import { calendar } from '../functions/calendar.js';
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
            .setMaxLength(200)
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
            .setMaxLength(19)
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
            .setMaxLength(255)
        )
        .addBooleanOption(option =>
            option
            .setName("calendar_only")
            .setDescription("Only shown in the calendar: not in the mission board, no reminder")
            .setRequired(false)
        )
        .addStringOption(option =>
            option
            .setName("color")
            .setDescription("Color in the calendar (default: always the same color for the same name)")
            .setRequired(false)
            .addChoices(
                { name: 'Blue', value: 'blue' },
                { name: 'Green', value: 'green' },
                { name: 'Purple', value: 'purple' },
                { name: 'Red', value: 'red' },
                { name: 'Orange', value: 'orange' },
                { name: 'Teal', value: 'teal' },
            )
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
        .setDescription("How an event is shown in the calendar: logo, color, calendar only")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Event name, pick it from the list")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addAttachmentOption( (option) =>
            option
            .setName("logo")
            .setDescription("Logo of the event (image, used for every event with this name)")
            .setRequired(false)
        )
        .addBooleanOption( (option) =>
            option
            .setName("remove_logo")
            .setDescription("Remove the logo of the event")
            .setRequired(false)
        )
        .addStringOption( (option) =>
            option
            .setName("color")
            .setDescription("Color in the calendar")
            .setRequired(false)
            .addChoices(
                { name: 'Blue', value: 'blue' },
                { name: 'Green', value: 'green' },
                { name: 'Purple', value: 'purple' },
                { name: 'Red', value: 'red' },
                { name: 'Orange', value: 'orange' },
                { name: 'Teal', value: 'teal' },
            )
        )
        .addBooleanOption( (option) =>
            option
            .setName("calendar_only")
            .setDescription("Only shown in the calendar: not in the mission board, no reminder")
            .setRequired(false)
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
            .setRequired(true)
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
            data: interaction.options.getString("data") ?? null,
            calendarOnly: interaction.options.getBoolean("calendar_only") ?? false,
            color: interaction.options.getString("color") ?? null
        };

        const eventRemove = (interaction.options.getSubcommand() != "remove") ? null : {
            event: interaction.options.getString("event") ?? null
        };

        const eventCalendar = (interaction.options.getSubcommand() != "calendar") ? null : {
            name: interaction.options.getString("name"),
            logo: interaction.options.getAttachment("logo") ?? null,
            removeLogo: interaction.options.getBoolean("remove_logo") ?? false,
            color: interaction.options.getString("color") ?? null,
            calendarOnly: interaction.options.getBoolean("calendar_only")
        };

        const eventData = (interaction.options.getSubcommand() != "data") ? null : {
            name: interaction.options.getString("name") ?? null
        };

        // Get the mission board channel
        //const channel = await interaction.guild.channels.fetch(globals.server.channel.missionBoard);
        const channel = await interaction.guild.channels.fetch("1573650148519706726");

        switch(interaction.options.getSubcommand()){
            case "add":
                const error = checkEvent(eventAdd);
                if(error) {
                    return await interaction.reply({
                        content: error,
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                await addEvent(eventAdd);

                await mb.editPanel(channel, "edit");

                await interaction.editReply({
                    content: `Event added`
                });
            break;
            case "remove":
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const removed = await removeEvent(eventRemove);

                await mb.editPanel(channel, "edit");

                await interaction.editReply({
                    content: removed > 0 ? `Event removed` : `Unknown event, pick it from the list`
                });
            break;
            case "calendar":
                const exists = await db.getval(`SELECT COUNT(*) FROM events WHERE event_name = ?`, [eventCalendar.name]);
                if(exists == 0) {
                    return await interaction.reply({
                        content: `Unknown event, pick it from the list`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if(eventCalendar.logo && (!eventCalendar.logo.contentType || !eventCalendar.logo.contentType.startsWith("image/"))) {
                    return await interaction.reply({
                        content: `The logo must be an image`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const changes = await editCalendarSettings(eventCalendar);

                await mb.editPanel(channel, "edit");

                await interaction.editReply({
                    content: changes.length > 0 ? `Calendar updated : ${changes.join(", ")}` : `Nothing to change: give a logo, a color or the calendar only option`
                });
            break;
            case "data":
                await editData(eventData, interaction);
            break;
            default:
            break;
        }
    }
}

// Check the given event data, returns an error message or null
function checkEvent(data) {
    const dateFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

    if(!dateFormat.test(data.date) || isNaN(new Date(data.date.replace(" ", "T") + "Z").getTime())) {
        return `The start date must follow this format : YYYY-MM-DD HH:MM:SS`;
    }

    if(data.endDate) {
        if(!dateFormat.test(data.endDate) || isNaN(new Date(data.endDate.replace(" ", "T") + "Z").getTime())) {
            return `The end date must follow this format : YYYY-MM-DD HH:MM:SS`;
        }

        if(new Date(data.endDate.replace(" ", "T") + "Z") <= new Date(data.date.replace(" ", "T") + "Z")) {
            return `The end date must be after the start date`;
        }
    }

    if(data.periodicity) {
        const parts = data.periodicity.trim().split(/\s+/);
        if(parts.length != 6 || parts.some(p => p != "*" && !/^\d+$/.test(p)) || parts.every(p => p == "*" || p == "0")) {
            return `The periodicity must follow this format : Y M D H M S, with '*' when it doesn't matter (ex: \`* * 7 * * *\` for every week)`;
        }
    }

    return null;
}

async function addEvent(data){
    await db.insert(
        'INSERT INTO events (event_name, event_parent_name, event_time_start, event_time_end, event_frequency, role_to_ping, event_data, calendar_only, calendar_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.name, data.parentName, data.date, data.endDate, data.periodicity ? data.periodicity.trim().split(/\s+/).join(" ") : null, data.role, data.data, data.calendarOnly ? 1 : 0, data.color]
    );
}


async function removeEvent(data){
    return await db.delete('DELETE FROM events WHERE event_name = ?', [data.event]);
}

// Logo, color and "calendar only" of every event with this name. Returns the list of changes
async function editCalendarSettings(data) {
    const changes = [];

    if(data.logo) {
        await calendar.saveLogo(data.name, data.logo.url);
        changes.push(`logo`);
    } else if(data.removeLogo) {
        calendar.removeLogo(data.name);
        changes.push(`logo removed`);
    }

    if(data.color) {
        await db.update(`UPDATE events SET calendar_color = ? WHERE event_name = ?`, [data.color, data.name]);
        changes.push(`color ${data.color}`);
    }

    if(data.calendarOnly != null) {
        await db.update(`UPDATE events SET calendar_only = ? WHERE event_name = ?`, [data.calendarOnly ? 1 : 0, data.name]);
        changes.push(data.calendarOnly ? `calendar only` : `shown in the mission board`);
    }

    return changes;
}

async function editData(data, interaction) {
    const eventData = await db.getrow(`SELECT * FROM events WHERE event_name = ?`, [data.name]);

    if(!eventData) {
        return await interaction.reply({
            content : `event unkown`,
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
    .setCustomId(`eventData${globals.separator}${eventData.event_id}`)
    .setTitle(`Event Data`);

    const input = new TextInputBuilder()
    .setCustomId(`dataContent`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(255)
    .setRequired(false);

    if(eventData.event_data) input.setValue(eventData.event_data);

    const label = new LabelBuilder()
    .setLabel(`data`)
    .setDescription(`data saved`)
    .setTextInputComponent(input)

    modal.addLabelComponents(label);

    await interaction.showModal(modal);
}
