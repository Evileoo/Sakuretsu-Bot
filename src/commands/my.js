import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { globals } from '../globals.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("my")
    .setDescription("Commands related to you")
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("name")
        .setDescription("Enter your in game name")
        .addStringOption( (option) =>
            option
            .setName("value")
            .setDescription("if you village tag is in your in game name, don't write it")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("timezone")
        .setDescription("Give your timezone in UTC format")
        .addStringOption( (option) =>
            option
            .setName("value")
            .setDescription("Format: +7 or -11 or +0")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("notebooks")
        .setDescription("Get a list of your notebooks")
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("schedule")
        .setDescription("Display your schedule")
    )
    , async execute(interaction){

        // Get all command data
        const command = {
            value: (interaction.options.getString("value")) ? interaction.options.getString("value") : null,
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null
        }

        switch(interaction.options.getSubcommand()){
            case "name":
                await changeName(command, interaction);
            break;
            case "timezone":
                await changeTimezone(command, interaction);
            break;
            case "notebooks":
                await getNotebooks(interaction);
            break;
            case "schedule":
                await getSchedule(interaction);
            break;
            default:
            break;
        }

        async function changeName(data, interaction) {
            // Checks
            if(data.value.length > 50) {
                return await interaction.reply({
                    content: `Your name is too long`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const exists = await db.getrow(`SELECT name FROM member WHERE id = ?`, [interaction.user.id]);

            if(exists) await db.update(`UPDATE member SET name = ? WHERE id = ?`, [data.value, interaction.user.id]);
            else await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [interaction.user.id, data.value]);

            // Update the name in discord
            await nameUpdates.updateName(interaction.user.id, interaction.guild);

            return await interaction.reply({
                content: `Your name has been edited`,
                flags: MessageFlags.Ephemeral
            });
        }

        async function changeTimezone(data, interaction) {
            // Checks
            if(isNaN(data.value) || (data.value[0] != "-" && data.value[0] != "+") || parseFloat(data.value) < -12 || parseFloat(data.value) > +12) {
                return await interaction.reply({
                    content: `You must provide a sign (+ or -) and then a number between 0 and 12`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const exists = await db.getrow(`SELECT timezone FROM member WHERE id = ?`, [interaction.user.id]);

            if(exists) await db.update(`UPDATE member SET timezone = ? WHERE id = ?`, [data.value, interaction.user.id]);
            else await db.insert(`INSERT INTO member (id, timezone) VALUES (?, ?)`, [interaction.user.id, data.value]);

            // Update the name in discord
            await nameUpdates.updateName(interaction.user.id, interaction.guild);

            return await interaction.reply({
                content: `Your timezone has been edited`,
                flags: MessageFlags.Ephemeral
            });
        }

        async function getNotebooks(interaction) {
            const notebooks = await db.getall(`SELECT name, visibility FROM notebook WHERE id = ? ORDER BY name ASC`, [interaction.user.id]);

            const embed = new EmbedBuilder()
            .setTitle(`My notebooks`)
            .setColor(globals.embed.black);

            if(notebooks.length == 0) {
                embed.setDescription(`You don't have any notebook yet.\nCreate one with the \`/notebooks create\` command`);
            
                interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                let visibility = "";
                let name = "";
                let tooLong = false;
                let i;
                for(i = 0; i < notebooks.length; i++) {
                    visibility += (notebooks[i].visibility == 0) ? "public\n" : "private\n";
                    name += `${notebooks[i].name}\n`;

                    if(i == 10 - 1) {
                        tooLong = true;
                        break;
                    }
                }

                embed.addFields(
                    { name: `Name`, value: `${name}`, inline: true },
                    { name: `Visibility`, value: `${visibility}`, inline: true }
                );

                const previous = new ButtonBuilder()
                .setCustomId(`nbList${globals.separator}p${globals.separator}0`)
                .setLabel(`Previous`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

                const next = new ButtonBuilder()
                .setCustomId(`nbList${globals.separator}n${globals.separator}0`)
                .setLabel(`Next`)
                .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                .addComponents(previous, next);

                if(tooLong) {
                    await interaction.reply({
                        embeds: [embed],
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        }

        async function getSchedule(interaction) {
            const member = await db.getrow(`SELECT timezone FROM member WHERE id = ?`, [interaction.user.id]);
            
            if(!member) {
                return await interaction.reply({
                    content: `No schedule setup`,
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const schedule = await db.getall(`SELECT day, period FROM schedule WHERE id = ?`, [interaction.user.id]);

            if(schedule.length == 0) {
                return await interaction.reply({
                    content: `No schedule setup`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const now = new Date();
            const offset = parseFloat(member.timezone);

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