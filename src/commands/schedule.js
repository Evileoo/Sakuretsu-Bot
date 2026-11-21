import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { scheduleEmbed } from '../functions/scheduleEmbed.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Manage schedules")
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit your schedule. I recommend you to execute '/my schedule' before exectuting this command")
        .addStringOption( (option) =>
            option
            .setName("day")
            .setDescription("The day you want to edit")
            .setRequired(true)
            .addChoices(
                { name: "Monday", value: "Mon" },
                { name: "Tuesday", value: "Tue" },
                { name: "Wednesday", value: "Wed" },
                { name: "Thursday", value: "Thu" },
                { name: "Friday", value: "Fri" },
                { name: "Saturday", value: "Sat" },
                { name: "Sunday", value: "Sun" },
                { name: "Week-end", value: "Sat,Sun" },
                { name: "Weekdays", value: "Mon,Tue,Wed,Thu,Fri" },
                { name: "Every day", value: "Mon,Tue,Wed,Thu,Fri,Sat,Sun" },
            )
        )
        .addStringOption( (option) =>
            option
            .setName("hours")
            .setDescription("Time of the day when you are availible. Format: HH:MM HH:MM, HH:MM HH:MM")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("of")
        .setDescription("Schedule of a member")
        .addUserOption( (option) =>
            option
            .setName("name")
            .setDescription("Discord name of the member")
            .setRequired(true)
        )
    )
    , async execute(interaction){

        // Get all command data
        const edit = (interaction.options.getSubcommand() != "edit") ? null : {
            day: (interaction.options.getString("day")) ? interaction.options.getString("day") : null,
            hours: (interaction.options.getString("hours")) ? interaction.options.getString("hours") : null
        };

        const of = (interaction.options.getSubcommand() != "of") ? null : {
            user: (interaction.options.getUser("name")) ? interaction.options.getUser("name") : null
        };

        let error;

        switch(interaction.options.getSubcommand()){
            case "edit":
                error = await editScheduleData(edit, interaction.user.id);

                if(error) {
                    await interaction.reply({
                        content: `${error}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await nameUpdates.updateName(interaction.user.id, interaction.guild);

                    await interaction.reply({
                        content: `Schedule updated successfully`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            break;
            case "of":
                await displaySchedule(interaction, of.user.id);
            break;
            default:
            break;
        }

        async function editScheduleData(data, id) {
            const days = data.day.split(",");
            const periods = data.hours.split(",").map(p => p.trim()).filter(Boolean);

            if(periods.length == 0) return "You must give at least one period (ex: 08:00 18:00)";

            // Check all the given data before editing anything
            for(const p of periods) {
                const split = p.split(" ").filter(Boolean);
                if(split.length != 2) return "You must separate the start and end of availibility by a space (ex: 08:00 18:00)";

                for(const time of split) {
                    if(time.split(":").length != 2) return "The hours and minutes must be separated by \":\" (ex: 15:20)";

                    const [hour, minute] = time.split(":");
                    if(!/^\d{1,2}$/.test(hour) || !/^\d{2}$/.test(minute)) return "Hours and minutes should be numbers (ex: 08:00 18:30)";
                    if(parseInt(hour) > 23 || parseInt(minute) > 59) return "Hours must be between 00 and 23, minutes between 00 and 59";
                }
            }

            // Replace the schedule of the given days
            for(const day of days) {
                await db.delete(`DELETE FROM schedule WHERE day = ? AND id = ?`, [day, id]);

                for(const p of periods) {
                    const [start, end] = p.split(" ").filter(Boolean);
                    await db.insert(`INSERT INTO schedule (id, day, period) VALUES (?, ?, ?)`, [id, day, `${start.padStart(5, "0")} ${end.padStart(5, "0")}`]);
                }
            }
        }

        async function displaySchedule(interaction, id) {
            const member = await db.getrow(`SELECT timezone, name FROM member WHERE id = ?`, [id]);

            if(!member) {
                return await interaction.reply({
                    content: `No schedule setup`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const schedule = await db.getall(`SELECT day, period FROM schedule WHERE id = ?`, [id]);

            if(schedule.length == 0) {
                return await interaction.reply({
                    content: `No schedule setup`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.reply({
                embeds: [scheduleEmbed.buildScheduleEmbed(member, schedule)],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
