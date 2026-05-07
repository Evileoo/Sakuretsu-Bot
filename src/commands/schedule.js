import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { messageContent } from '../functions/messageContent.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Manage schedules")
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit your schedule. I recommend you to execute 'schedule display' before exectuting this command")
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
        .setName("display")
        .setDescription("Displays your schedule")
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
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("define")
        .setDescription("Data required for the bot to work")
        .addStringOption( (option) =>
            option
            .setName("timezone")
            .setDescription("The timezone you're in. Format: +07 or -06")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Your in game name (without the village tag)")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("setup")
        .setDescription("Setup assistant for creating your schedule")
        .addStringOption( (option) =>
            option
            .setName("step")
            .setDescription("The step you want to start from")
            .setRequired(false)
            .addChoices(
                { name: "Informations", value: "1" },
                { name: "Required data", value: "2" },
                { name: "Availibilty hours", value: "3" }
            )
        )
    )
    , async execute(interaction){

        // Get all command data
        const setup = (interaction.options.getSubcommand() != "setup") ? null : {
            step: (interaction.options.getString("step")) ? interaction.options.getString("step") : "1"
        };

        const define = (interaction.options.getSubcommand() != "define") ? null : {
            timezone: (interaction.options.getString("timezone")) ? interaction.options.getString("timezone") : "+00",
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null
        };

        const edit = (interaction.options.getSubcommand() != "edit") ? null : {
            day: (interaction.options.getString("day")) ? interaction.options.getString("day") : null,
            hours: (interaction.options.getString("hours")) ? interaction.options.getString("hours") : null
        };

        const of = (interaction.options.getSubcommand() != "of") ? null : {
            user: (interaction.options.getUser("name")) ? interaction.options.getUser("name") : null
        };

        let error;

        switch(interaction.options.getSubcommand()){
            case "setup":
                const messageData = {
                    category: `schedule`,
                    messageId: setup.step,
                    messageType: `reply`
                }

                await messageContent.sendMessage(messageData, interaction);
            break;
            case "define":
                error = await defineMemberData(define, interaction.user.id);


                if(error) {
                    await interaction.reply({
                        content: `${error}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    nameUpdates.updateName(interaction.user.id, interaction.guild);

                    await interaction.reply({
                        content: `Name and timezone updated successfully`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            break;
            case "edit":
                error = await editScheduleData(edit, interaction.user.id);

                if(error) {
                    await interaction.reply({
                        content: `${error}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    nameUpdates.updateName(interaction.user.id, interaction.guild);

                    await interaction.reply({
                        content: `Schedule updated successfully`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            break;
            case "display":
                await displaySchedule(interaction, interaction.user.id);
            break;
            case "of":
                await displaySchedule(interaction, of.user.id);
            break;
            default:
            break;
        }

        async function defineMemberData(data, id) {
            // Check given data
            if(data.timezone[0] != "+" && data.timezone[0] != "-") return "The timezone format must be + or - and a number between 0 and 12 written on 2 digits (ex: +01 / -10 / +11 / -04)";
            if(data.timezone[1] != "0" && data.timezone[1] != "1") return "The timezone format must be + or - and a number between 0 and 12 written on 2 digits (ex: +01 / -10 / +11 / -04)";
            if(isNaN(data.timezone[2])) return "The timezone format must be + or - and a number between 0 and 12 written on 2 digits (ex: +01 / -10 / +11 / -04)";

            // Check database data
            const existing = await db.getrow(`SELECT name, timezone FROM member WHERE id = ?`, [id]);

            if(existing) { // Update
                await db.update(`UPDATE member SET name = ?, timezone = ? WHERE id = ?`, [data.name, data.timezone, id]);
            } else { // Insert
                await db.insert(`INSERT INTO member (id, name, timezone) VALUES (?, ?, ?)`, [id, data.name, data.timezone]);
            }
        }

        async function editScheduleData(data, id) {
            // Check given data
            const periods = data.hours;
            const days = data.day;

            const memberData = await db.getrow(`SELECT timezone FROM member WHERE id = ?`, [id]);

            for(const day of days.split(",")) {

                const existing = await db.getrow(`SELECT DISTINCT id FROM schedule WHERE day = ? AND id = ? LIMIT 1`, [day, id]);
                if(existing) await db.delete(`DELETE FROM schedule WHERE day = ? AND id = ?`, [day, id]);

                for(const p of periods.split(", ")) {

                    if(p.split(" ").length != 2) return "You must separate the start and end of availibility by a space (ex: 08:00 18:00)";

                    const start = p.split(" ")[0];
                    const end = p.split(" ")[1];

                    if(start.split(":").length != 2 || end.split(":").length != 2) return "The hours and minutes must be separated by \":\" (ex: 15:20)";

                    const startHour = start.split(":")[0];
                    const startMinute = start.split(":")[1];
                    const endHour = end.split(":")[0];
                    const endMinute = end.split(":")[1];

                    if(isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return "Hours and minutes should be numbers";

                    await db.insert(`INSERT INTO schedule (id, day, period) VALUES (?, ?, ?)`, [id, day, p]);
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

            const scheduleTimes = [
                { name: `Monday`, data: [] },
                { name: `Tuesday`, data: [] },
                { name: `Wednesday`, data: [] },
                { name: `Thursday`, data: [] },
                { name: `Friday`, data: [] },
                { name: `Saturday`, data: [] },
                { name: `Sunday`, data: [] },
            ];

            for(const row of schedule) {
                const start = row.period.split(" ")[0];
                const end = row.period.split(" ")[1];

                const startHour = parseInt(start.split(":")[0]) - offset;
                const startMinute = parseInt(start.split(":")[1]);
                const endHour = parseInt(end.split(":")[0]) - offset;
                const endMinute = parseInt(end.split(":")[1]);

                const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), startHour, startMinute, 0));
                const utcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), endHour, endMinute, 0));

                const period = {
                    start: utcStart,
                    end: utcEnd
                }

                switch(row.day) {
                    case "Mon":
                        scheduleTimes[0].data.push(period);
                    break;
                    case "Tue":
                        scheduleTimes[1].data.push(period);
                    break;
                    case "Wed":
                        scheduleTimes[2].data.push(period);
                    break;
                    case "Thu":
                        scheduleTimes[3].data.push(period);
                    break;
                    case "Fri":
                        scheduleTimes[4].data.push(period);
                    break;
                    case "Sat":
                        scheduleTimes[5].data.push(period);
                    break;
                    case "Sun":
                        scheduleTimes[6].data.push(period);
                    break;
                }
            }

            const scheduleEmbed = new EmbedBuilder()
            .setTitle(`${member.name}'s availibilities`)
            .setTimestamp();

            for(const day of scheduleTimes) {
                let periods = "";

                if(day.data.length == 0) {
                    scheduleEmbed.addFields({ name: `${day.name}`, value: `Unknown` });
                } else {
                    for(const period of day.data) {
                        if(periods.length > 0) periods += " / "
                        periods += `<t:${period.start.getTime() / 1000}:T> to <t:${period.end.getTime() / 1000}:T>`;
                    }

                    scheduleEmbed.addFields({ name: `${day.name}`, value: `${periods}` });
                }
            }

            await interaction.reply({
                embeds: [scheduleEmbed],
                flags: MessageFlags.Ephemeral
            });

        }
    }
}
