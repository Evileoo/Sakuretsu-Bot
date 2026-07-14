import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
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
            .setDescription("Event name - pick from autocompletes if the event is known")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("date")
            .setDescription("date format : YYYY-MM-DD HH:MM:SS (ingame date)")
            .setRequired(true)
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
    , async execute(interaction){

        // Get all command data
        const eventAdd = (interaction.options.getSubcommand() != "add") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            date: (interaction.options.getString("date")) ? interaction.options.getString("date") : null,
            periodicity: (interaction.options.getString("periodicity")) ? interaction.options.getString("periodicity") : null,
            role: (interaction.options.getRole("role")) ? interaction.options.getRole("role") : null
        };

        const eventRemove = (interaction.options.getSubcommand() != "remove") ? null : {
            event: (interaction.options.getString("event")) ? interaction.options.getString("event") : null
        };

        const eventCalendar = (interaction.options.getSubcommand() != "calendar") ? null : {
            calendar: (interaction.options.getAttachment("image")) ? interaction.options.getAttachment("image") : null
        };

        // Get guild and channel objects
        const guild = await interaction.client.guilds.cache.get(globals.server.id);
        const channel = await guild.channels.cache.get(globals.server.channel.missionBoard);

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
            default:
            break;
        }
    }
}

async function addEvent(data){
    await db.insert('INSERT INTO events (event_name, event_time, event_frequency, role_to_ping) VALUES (?, ?, ?, ?)', [data.name, data.date, data.periodicity, data.role]);
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