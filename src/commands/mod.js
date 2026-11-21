import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { villageFlow } from '../functions/villageFlow.js';
import { villageMembership } from '../functions/villageMembership.js';
import { villageVisit } from '../functions/villageVisit.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderator commands")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit a member")
        .addUserOption( (option) =>
            option
            .setName("member")
            .setDescription("member in-game name")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("member in-game name")
            .setMaxLength(50)
        )
        .addStringOption( (option) =>
            option
            .setName("timezone")
            .setDescription("member timezone (ex: +2, -11, +0)")
            .setMaxLength(3)
        )
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("member in-game ID")
            .setMaxLength(30)
        )
    )
    .addSubcommandGroup( (subcommandgroup) =>
        subcommandgroup
        .setName("village")
        .setDescription("village edition commands")
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("change")
            .setDescription("Edit someone's village")
            .addUserOption( (option) =>
                option
                .setName("member")
                .setDescription("member with a village to edit")
                .setRequired(true)
            )
            .addStringOption( (option) =>
                option
                .setName("village")
                .setDescription("village to add the member in")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("subkage")
            .setDescription("Promote or demote someone from subkage role in his village")
            .addUserOption( (option) =>
                option
                .setName("member")
                .setDescription("member to promote or demote")
                .setRequired(true)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("visit")
            .setDescription("See and write in all the channels of a village for some time, to help it")
            .addStringOption( (option) =>
                option
                .setName("village")
                .setDescription("village to visit")
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption( (option) =>
                option
                .setName("hours")
                .setDescription("duration of the visit in hours (default: 24, max: 168)")
                .setMinValue(1)
                .setMaxValue(168)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("leave")
            .setDescription("End your visit of a village")
            .addStringOption( (option) =>
                option
                .setName("village")
                .setDescription("village you are visiting")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
    , async execute(interaction){

        const command = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            timezone: (interaction.options.getString("timezone")) ? interaction.options.getString("timezone") : null,
            id: (interaction.options.getString("id")) ? interaction.options.getString("id") : null,
            village: (interaction.options.getString("village")) ? interaction.options.getString("village") : null,
            member: (interaction.options.getUser("member")) ? interaction.options.getUser("member") : null,
        }

        switch(interaction.options.getSubcommandGroup()){
            case "village":
                switch(interaction.options.getSubcommand()) {
                    case "change":
                        await changeVillage(interaction, command);
                    break;
                    case "subkage":
                        await changePosition(interaction, command);
                    break;
                    case "visit":
                        await visitVillage(interaction, command);
                    break;
                    case "leave":
                        await leaveVisit(interaction, command);
                    break;
                    default:
                    break;
                }
            break;
            default:
                switch(interaction.options.getSubcommand()) {
                    case "edit":
                        await editMember(interaction, command);
                    break;
                    default:
                    break;
                }
            break;
        }

        async function editMember(interaction, params) {

            if(!params.name && !params.timezone && !params.id) {
                return await interaction.reply({
                    content: `please give data to edit`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if(params.timezone && !nameUpdates.isValidTimezone(params.timezone)) {
                return await interaction.reply({
                    content: `The timezone must be a sign (+ or -) and then a number between 0 and 12 (ex: +2, -11, +0)`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const existing = await db.getrow(`SELECT * FROM member WHERE id = ?`, [params.member.id]);

            if(!existing) {
                await db.insert(`INSERT INTO member (id) VALUES (?)`, [params.member.id]);
            }

            if(params.name) await db.update(`UPDATE member SET name = ? WHERE id = ?`, [params.name, params.member.id]);
            if(params.timezone) await db.update(`UPDATE member SET timezone = ? WHERE id = ?`, [params.timezone, params.member.id]);
            if(params.id) await db.update(`UPDATE member SET ig_id = ? WHERE id = ?`, [params.id, params.member.id]);

            // Update the name in discord
            await nameUpdates.updateName(params.member.id, interaction.guild);

            return await interaction.reply({
                content: `member updated successfully`,
                flags: MessageFlags.Ephemeral
            });

        }

        async function changeVillage(interaction, params) {
            // Checks
            const village = await db.getrow(`SELECT tag, role_id, name, flow, moderation, flow_incoming FROM village WHERE tag = ?`, [params.village]);
            if(!village) {
                return await interaction.reply({
                    content: `Unknown village, pick it from the list`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const guildMember = await villageFlow.fetchMember(interaction.guild, params.member.id);
            if(!guildMember) {
                return await interaction.reply({
                    content: `This member is not in the server`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = await db.getrow(`SELECT * FROM member WHERE id = ?`, [params.member.id]);
            if(member && member.village_tag == village.tag) {
                return await interaction.reply({
                    content: `This member is already in this village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.reply({
                content: `Added`,
                flags: MessageFlags.Ephemeral
            });

            if(!member) {
                await db.insert(`INSERT INTO member (id) VALUES (?)`, [params.member.id]);
            }

            if(member && member.village_tag) {
                // Remove origin village
                const originVillage = await db.getrow(`SELECT * FROM village WHERE tag = ?`, [member.village_tag]);

                if(originVillage) {
                    await guildMember.roles.remove(originVillage.role_id);

                    // The member loses his kage / sub kage position in his old village
                    await villageFlow.removeVillageRanks(interaction.guild, guildMember, originVillage);

                    // Send message in village flow
                    const oldFlowEmbed = new EmbedBuilder()
                    .setTitle(`Member left`)
                    .setDescription(`<@${params.member.id}> has left the village !\nremoved by <@${interaction.user.id}>`)
                    .setColor(globals.embed.orange)
                    .setTimestamp();

                    await villageFlow.sendLog(interaction.guild, originVillage, originVillage.flow_leave, { embeds: [oldFlowEmbed] });
                }
            } else {
                // Remove lone role
                await guildMember.roles.remove(globals.server.role.lone);
            }

            // Add village role
            await guildMember.roles.add(village.role_id);

            // Update database
            await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [village.tag, params.member.id]);

            // Update the village tag in the member name
            await nameUpdates.updateName(params.member.id, interaction.guild);

            // His pending applications are not needed anymore
            await villageMembership.cancelApplications(interaction.guild, params.member.id, `moved to [${village.tag}] by a moderator`);

            // Send message in village flow
            const flowEmbed = new EmbedBuilder()
            .setTitle(`New member`)
            .setDescription(`<@${params.member.id}> has joined the village !\nadded by <@${interaction.user.id}>`)
            .setColor(globals.embed.green)
            .setTimestamp();

            await villageFlow.sendLog(interaction.guild, village, village.flow_incoming, { embeds: [flowEmbed] });
        }

        async function changePosition(interaction, params) {
            // Checks
            const target = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [params.member.id]);

            if(!target || !target.village_tag) {
                return await interaction.reply({
                    content: `This member is not from a village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const village = await db.getrow(`SELECT flow, moderation, flow_promote FROM village WHERE tag = ?`, [target.village_tag]);
            const member = await villageFlow.fetchMember(interaction.guild, params.member.id);

            if(!village || !member) {
                return await interaction.reply({
                    content: `This member or his village couldn't be found`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Reply to interaction before it breaks
            await interaction.reply({
                content: `Promotion/Demotion successful`,
                flags: MessageFlags.Ephemeral
            });

            // Fetch moderation channel
            const moderation = await villageFlow.fetchChannel(interaction.guild, village.moderation);

            // Prepare embed
            const flowEmbed = new EmbedBuilder()
            .setTimestamp();

            // Promote or demote
            if(member.roles.cache.has(globals.server.role.sub)) {
                await member.roles.remove(globals.server.role.sub);

                if(moderation) await moderation.permissionOverwrites.edit(params.member.id, {
                    ViewChannel: false
                });

                flowEmbed
                .setTitle(`A member has been demoted`)
                .setDescription(`<@${params.member.id}> lost his/her sub kage position\nExecuted by <@${interaction.user.id}>`)
                .setColor(globals.embed.red);
            } else {
                await member.roles.add(globals.server.role.sub);

                if(moderation) await moderation.permissionOverwrites.edit(params.member.id, {
                    ViewChannel: true
                });

                flowEmbed
                .setTitle(`A member has been promoted`)
                .setDescription(`<@${params.member.id}> got a sub kage position\nExecuted by <@${interaction.user.id}>`)
                .setColor(globals.embed.green);
            }

            // Send flow message
            await villageFlow.sendLog(interaction.guild, village, village.flow_promote, { embeds: [flowEmbed] });
        }

        async function visitVillage(interaction, params) {
            // Checks (it gives access to private channels: not only the default permission of the command)
            if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await interaction.reply({ content: `You don't have permissions to execute this command`, flags: MessageFlags.Ephemeral });
            }

            const village = await db.getrow(`SELECT tag, name, category, flow, moderation FROM village WHERE tag = ?`, [params.village]);
            if(!village) {
                return await interaction.reply({ content: `Unknown village, pick it from the list`, flags: MessageFlags.Ephemeral });
            }

            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            if(member?.village_tag == village.tag) {
                return await interaction.reply({ content: `You are already in this village`, flags: MessageFlags.Ephemeral });
            }

            if(!await villageFlow.fetchChannel(interaction.guild, village.category)) {
                return await interaction.reply({ content: `The category of this village couldn't be found`, flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const visit = await villageVisit.start(interaction.guild, village, interaction.user.id, interaction.options.getInteger("hours") ?? 24);

            await interaction.editReply({
                content: visit.extended
                    ? `Your visit of [${village.tag}] ${village.name} is extended until <t:${visit.end}:f>`
                    : `You can see the channels of [${village.tag}] ${village.name} until <t:${visit.end}:f>. End it before with \`/mod village leave\``
            });
        }

        async function leaveVisit(interaction, params) {
            const visit = await db.getrow(`SELECT * FROM village_visit WHERE village_tag = ? AND member_id = ?`, [params.village, interaction.user.id]);
            if(!visit) {
                return await interaction.reply({ content: `You are not visiting this village, pick it from the list`, flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            await villageVisit.end(interaction.guild, visit, `left`);

            await interaction.editReply({ content: `Visit of [${visit.village_tag}] ended` });
        }
    }
}
