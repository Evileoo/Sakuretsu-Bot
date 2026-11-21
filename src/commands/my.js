import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { scheduleEmbed } from '../functions/scheduleEmbed.js';
import { villageFlow } from '../functions/villageFlow.js';
import { villageMembership } from '../functions/villageMembership.js';

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
            .setMaxLength(50)
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
            .setMaxLength(3)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("id")
        .setDescription("Give your ingame ID")
        .addStringOption( (option) =>
            option
            .setName("value")
            .setDescription("in game ID")
            .setRequired(true)
            .setMaxLength(30)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("schedule")
        .setDescription("Display your schedule")
    )
    .addSubcommandGroup( (group) =>
        group
        .setName("village")
        .setDescription("Join or leave a village")
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("apply")
            .setDescription("Ask to join a village")
            .addStringOption( (option) =>
                option
                .setName("village")
                .setDescription("Village to join, pick it from the list")
                .setRequired(true)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("message")
                .setDescription("Message for the Kage and BroKages of the village")
                .setRequired(false)
                .setMaxLength(500)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("cancel")
            .setDescription("Cancel your pending application")
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("leave")
            .setDescription("Leave your village")
        )
    )
    , async execute(interaction){

        // Get all command data
        const command = {
            value: interaction.options.getString("value") ?? null
        }

        if(interaction.options.getSubcommandGroup() == "village") {
            switch(interaction.options.getSubcommand()) {
                case "apply":
                    return await apply(interaction);
                case "cancel":
                    return await cancelApplication(interaction);
                case "leave":
                    return await leave(interaction);
            }
            return;
        }

        switch(interaction.options.getSubcommand()){
            case "name":
                await changeName(command, interaction);
            break;
            case "timezone":
                await changeTimezone(command, interaction);
            break;
            case "schedule":
                await getSchedule(interaction);
            break;
            case "id":
                await id(command, interaction);
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
            if(!nameUpdates.isValidTimezone(data.value)) {
                return await interaction.reply({
                    content: `You must provide a sign (+ or -) and then a number between 0 and 12 (ex: +2, -11, +0)`,
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

        async function getSchedule(interaction) {
            const member = await db.getrow(`SELECT name, timezone FROM member WHERE id = ?`, [interaction.user.id]);

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

            await interaction.reply({
                embeds: [scheduleEmbed.buildScheduleEmbed(member, schedule)],
                flags: MessageFlags.Ephemeral
            });
        }

        async function answer(content) {
            return await interaction.reply({
                content: content,
                flags: MessageFlags.Ephemeral
            });
        }

        async function apply(interaction) {
            const tag = interaction.options.getString("village").toUpperCase();
            const message = interaction.options.getString("message") ?? null;

            // Checks
            const member = await db.getrow(`SELECT name, timezone, village_tag, ig_id FROM member WHERE id = ?`, [interaction.user.id]);
            if(member && member.village_tag) {
                return await answer(`You are already in a village. Leave it first with \`/my village leave\``);
            }

            const village = await db.getrow(`SELECT tag, name, moderation FROM village WHERE tag = ?`, [tag]);
            if(!village) {
                return await answer(`Unknown village, pick it from the list`);
            }

            const pending = await db.getrow(`SELECT village_tag FROM application WHERE member_id = ?`, [interaction.user.id]);
            if(pending) {
                return await answer(`You already have a pending application to [${pending.village_tag}]. Cancel it with \`/my village cancel\` to apply somewhere else`);
            }

            if(member && member.ig_id) {
                const banned = await db.getrow(`SELECT 1 FROM status WHERE status = 'ban' AND village_tag = ? AND member_id = ? LIMIT 1`, [village.tag, member.ig_id]);
                if(banned) {
                    return await answer(`You are banned from this village`);
                }
            }

            const moderation = await villageFlow.fetchChannel(interaction.guild, village.moderation);
            if(!moderation) {
                return await answer(`This village can't receive applications for now`);
            }

            if(!member) {
                await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [interaction.user.id, (interaction.member.displayName ?? interaction.user.username).slice(0, 50)]);
            }

            const applicationId = await db.insert(`INSERT INTO application (member_id, village_tag, message) VALUES (?, ?, ?)`, [interaction.user.id, village.tag, message]);

            // Send the application to the Kage and BroKages
            const embed = new EmbedBuilder()
            .setTitle(`New application`)
            .setDescription(`<@${interaction.user.id}> wants to join the village`)
            .addFields(
                { name: `In game name`, value: `${member?.name ?? interaction.member.displayName ?? interaction.user.username}`, inline: true },
                { name: `In game ID`, value: `${member?.ig_id ?? `Not given`}`, inline: true },
                { name: `Timezone`, value: `${member?.timezone ? `UTC${member.timezone}` : `Not given`}`, inline: true },
                { name: `Message`, value: message ?? `No message` }
            )
            .setColor(globals.embed.yellow)
            .setTimestamp();

            const accept = new ButtonBuilder()
            .setCustomId(`villageApply${globals.separator}a${globals.separator}${applicationId}`)
            .setLabel(`Accept`)
            .setStyle(ButtonStyle.Success);

            const deny = new ButtonBuilder()
            .setCustomId(`villageApply${globals.separator}d${globals.separator}${applicationId}`)
            .setLabel(`Deny`)
            .setStyle(ButtonStyle.Danger);

            const sent = await moderation.send({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(accept, deny)]
            });

            await db.update(`UPDATE application SET message_id = ? WHERE id = ?`, [sent.id, applicationId]);

            return await answer(`Your application to **[${village.tag}] ${village.name}** has been sent. You will receive a private message with the answer`);
        }

        async function cancelApplication(interaction) {
            const cancelled = await villageMembership.cancelApplications(interaction.guild, interaction.user.id, `withdrawn by the member`);

            return await answer(cancelled > 0 ? `Your application has been cancelled` : `You don't have any pending application`);
        }

        async function leave(interaction) {
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const village = member?.village_tag ? await db.getrow(`SELECT tag, name FROM village WHERE tag = ?`, [member.village_tag]) : null;

            if(!village) {
                return await answer(`You are not in a village`);
            }

            const isKage = interaction.member.roles.cache.has(globals.server.role.kage);

            const confirm = new ButtonBuilder()
            .setCustomId(`villageLeave${globals.separator}y${globals.separator}${village.tag}`)
            .setLabel(`Leave the village`)
            .setStyle(ButtonStyle.Danger);

            const cancel = new ButtonBuilder()
            .setCustomId(`villageLeave${globals.separator}n${globals.separator}${village.tag}`)
            .setLabel(`Stay`)
            .setStyle(ButtonStyle.Secondary);

            return await interaction.reply({
                content: `Do you really want to leave **[${village.tag}] ${village.name}** ?${isKage ? `\nYou are the Kage : the BroKage who has been in the server for the longest time will become Kage.` : ``}`,
                components: [new ActionRowBuilder().addComponents(confirm, cancel)],
                flags: MessageFlags.Ephemeral
            });
        }

        async function id(command, interaction) {
            const member = await db.getrow(`SELECT ig_id FROM member WHERE id = ?`, [interaction.user.id]);

            if(!member) {
                await db.insert(`INSERT INTO member (id, ig_id) VALUES (?, ?)`, [interaction.user.id, command.value]);
            } else {
                await db.update(`UPDATE member SET ig_id = ? WHERE id = ?`, [command.value, interaction.user.id]);
            }

            await interaction.reply({
                content: `Your ID has been saved`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
