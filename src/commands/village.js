import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { lists } from '../functions/lists.js';
import { villageFlow } from '../functions/villageFlow.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { docs } from '../functions/docs.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("village")
    .setDescription("Village management commands")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.SendPolls)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("create")
        .setDescription("|MOD ONLY| Create a village")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("In game village name")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("tag")
            .setDescription("In game village tag")
            .setRequired(true)
            .setMaxLength(4)
        )
        .addUserOption( (option) =>
            option
            .setName("kage")
            .setDescription("Village Kage")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("delete")
        .setDescription("|MOD ONLY| Delete a village")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Pick the village to delete from the list")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("rename")
        .setDescription("Rename the village")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("New village name")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("tag")
            .setDescription("New village tag")
            .setRequired(true)
            .setMaxLength(4)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("subkage")
        .setDescription("Add or remove the subkage role to a member")
        .addUserOption( (option) =>
            option
            .setName("member")
            .setDescription("Member to add or remove the role")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("invite")
        .setDescription("Invite a member to the village")
        .addUserOption( (option) =>
            option
            .setName("member")
            .setDescription("in-game name of the member")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("rules")
        .setDescription("Edit village rules")
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("recolor")
        .setDescription("Recolor the village role")
        .addStringOption( (option) =>
            option
            .setName("color")
            .setDescription("Color in hexadecimal value (type 'CSS Color Picker' on Google to get a color)")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("second")
            .setDescription("Color in hexadecimal value (type 'CSS Color Picker' on Google to get a color)")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("ban")
        .setDescription("ban a member from village")
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("In-game ID")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("In-game name")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("Ban reason")
            .setRequired(true)
            .setMaxLength(50)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("unban")
        .setDescription("unban a member")
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("Select from the list")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("Unban reason")
            .setRequired(true)
            .setMaxLength(50)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("warn")
        .setDescription("warn a member from village")
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("In-game ID")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("In-game name")
            .setRequired(true)
            .setMaxLength(30)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("Warn reason")
            .setRequired(true)
            .setMaxLength(50)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("sanctions")
        .setDescription("get a list of sanctions")
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("Filter on member - select from the list")
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("type")
            .setDescription("Filter on reason")
            .setRequired(false)
            .addChoices(
                { name: `Warn`, value: `warn` },
                { name: `Ban`, value: `ban` }
            )
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("kick")
        .setDescription("kick out someone of the village")
        .addUserOption( (option) =>
            option
            .setName("member")
            .setDescription("Member to kick out of the village")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("member-name")
        .setDescription("rename a member from the village")
        .addUserOption( (option) =>
            option
            .setName("member")
            .setDescription("Member to rename")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("member new name")
            .setRequired(true)
            .setMaxLength(50)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("ping")
        .setDescription("ping your village")
    )
    .addSubcommandGroup( (group) =>
        group
        .setName("tac")
        .setDescription("Tri-Army Clash channels shared with other villages")
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("create")
            .setDescription("|KAGE ONLY| Create a channel shared with the villages of your Tri-Army Clash")
            .addStringOption( (option) =>
                option
                .setName("village1")
                .setDescription("Village in your Tri-Army Clash, pick it from the list")
                .setRequired(true)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("village2")
                .setDescription("Other village in your Tri-Army Clash, pick it from the list")
                .setRequired(false)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("village3")
                .setDescription("Other village in your Tri-Army Clash, pick it from the list")
                .setRequired(false)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("village4")
                .setDescription("Other village in your Tri-Army Clash, pick it from the list")
                .setRequired(false)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("village5")
                .setDescription("Other village in your Tri-Army Clash, pick it from the list")
                .setRequired(false)
                .setAutocomplete(true)
                .setMaxLength(4)
            )
            .addStringOption( (option) =>
                option
                .setName("name")
                .setDescription("Name of the channel (default: tac + the village tags)")
                .setRequired(false)
                .setMaxLength(80)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("delete")
            .setDescription("Delete a Tri-Army Clash channel created by your village")
            .addStringOption( (option) =>
                option
                .setName("channel")
                .setDescription("Pick the channel from the list")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
    , async execute(interaction){

        // Get all command data
        const data = {
            name: interaction.options.getString("name") ?? null,
            tag: interaction.options.getString("tag") ?? null,
            kage: interaction.options.getUser("kage") ?? null,
            member: interaction.options.getUser("member") ?? null,
            color: interaction.options.getString("color") ?? null,
            color2: interaction.options.getString("second") ?? null,
            id: interaction.options.getString("id") ?? null,
            reason: interaction.options.getString("reason") ?? null,
            type: interaction.options.getString("type") ?? null
        }

        if(interaction.options.getSubcommandGroup() == "tac") {
            switch(interaction.options.getSubcommand()) {
                case "create":
                    return await tacCreate(interaction);
                case "delete":
                    return await tacDelete(interaction);
            }
            return;
        }

        switch(interaction.options.getSubcommand()) {
            case "create":
                await createVillage(data, interaction);
            break;
            case "delete":
                await deleteVillage(data, interaction);
            break;
            case "rename":
                await renameVillage(data, interaction);
            break;
            case "subkage":
                await subKageManage(data, interaction);
            break;
            case "invite":
                await inviteToVillage(data, interaction);
            break;
            case "rules":
                await editRules(data, interaction);
            break;
            case "recolor":
                await recolorVillage(data, interaction);
            break;
            case "ban":
            case "unban":
            case "warn":
                await status(data, interaction);
            break;
            case "sanctions":
                await statusList(data, interaction);
            break;
            case "kick":
                await kick(data, interaction);
            break;
            case "member-name":
                await renameMember(data, interaction);
            break;
            case "ping":
                await ping(interaction);
            break;
            default:
            break;
        }

        async function answer(interaction, content) {
            return await interaction.reply({
                content: content,
                flags: MessageFlags.Ephemeral
            });
        }

        // Get the village of the member executing the command
        async function getExecutorVillage(interaction, columns) {
            const executor = await db.getrow(`SELECT id, name, village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            if(!executor || !executor.village_tag) return null;

            const village = await db.getrow(`SELECT ${columns} FROM village WHERE tag = ?`, [executor.village_tag]);
            if(!village) return null;

            return { executor, village };
        }

        async function createVillage(data, interaction) {
            // Checks
            if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await answer(interaction, `You don't have permissions to execute this command`);
            }

            let kageMember = null;
            if(data.kage) {
                kageMember = await villageFlow.fetchMember(interaction.guild, data.kage.id);
                if(!kageMember) {
                    return await answer(interaction, `<@${data.kage.id}> is not in the server`);
                }

                const accountCreated = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.kage.id]);
                if(!accountCreated) {
                    await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [data.kage.id, (kageMember.displayName ?? data.kage.username).slice(0, 50)]);
                } else if(accountCreated.village_tag != null) {
                    return await answer(interaction, `<@${data.kage.id}> is already in a village`);
                }
            }

            const tagTaken = await db.getrow(`SELECT name FROM village WHERE tag = ?`, [data.tag]);
            if(tagTaken) {
                return await answer(interaction, `An existing village already has this tag`);
            }

            // Send the message before interaction breaks
            await answer(interaction, `Village created`);

            // Create the role
            const role = await interaction.guild.roles.create({
                name: `${data.name}`,
                hoist: true,
                reason: `${data.tag} ${data.name}`
            });

            // Create the category
            const category = await interaction.guild.channels.create({
                name: `${data.name}`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    },
                    {
                        id: role.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    }
                ]
            });

            // Create the channels
            const flow = await interaction.guild.channels.create({
                name: `flow`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await flow.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });

            const rules = await interaction.guild.channels.create({
                name: `rules`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await rules.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });

            const announcements = await interaction.guild.channels.create({
                name: `announcements`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await announcements.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });
            await announcements.permissionOverwrites.edit(globals.server.role.sub, {
                SendMessages: true
            });

            const general = await interaction.guild.channels.create({
                name: `general`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await general.permissionOverwrites.edit(globals.server.role.kage, {
                ManageMessages: true
            });

            const moderation = await interaction.guild.channels.create({
                name: `moderation`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await moderation.permissionOverwrites.edit(role.id, {
                ViewChannel: false
            });
            if(data.kage) {
                await moderation.permissionOverwrites.edit(data.kage.id, {
                    ViewChannel: true
                });
            }

            // Edit Kage roles
            if(kageMember) {
                await kageMember.roles.add([role.id, globals.server.role.kage, globals.server.role.sub]);
                await kageMember.roles.remove(globals.server.role.lone);
            }

            // Create the panel in moderation for village flow messages
            const flowPanel = new EmbedBuilder()
            .setTitle(`Flow messages Manager`)
            .setDescription(`This panel chooses where the village events are written.\n🟩 green : in <#${flow.id}>, visible by everyone in the village\n🟥 red : only in this channel\n\nAll the village commands : ${docs.mention(`village-management`)}`)
            .setColor(globals.embed.white);

            const newMember = new ButtonBuilder()
            .setCustomId(`vflow${globals.separator}i${globals.separator}0`)
            .setLabel(`New member`)
            .setStyle(ButtonStyle.Success);

            const byeMember = new ButtonBuilder()
            .setCustomId(`vflow${globals.separator}l${globals.separator}0`)
            .setLabel(`Member leave`)
            .setStyle(ButtonStyle.Success);

            const warnMember = new ButtonBuilder()
            .setCustomId(`vflow${globals.separator}w${globals.separator}0`)
            .setLabel(`Member warned`)
            .setStyle(ButtonStyle.Success);

            const banMember = new ButtonBuilder()
            .setCustomId(`vflow${globals.separator}b${globals.separator}0`)
            .setLabel(`Member banned`)
            .setStyle(ButtonStyle.Success);

            const subMember = new ButtonBuilder()
            .setCustomId(`vflow${globals.separator}s${globals.separator}0`)
            .setLabel(`Member promoted/demoted`)
            .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
            .addComponents(newMember, byeMember, warnMember, banMember, subMember);

            const flowPanelMessage = await moderation.send({
                embeds: [flowPanel],
                components: [row]
            });
            await flowPanelMessage.pin();

            // Send message in village flow concerning village creation
            const villageCreation = new EmbedBuilder()
            .setTitle(`${data.name} village created !`)
            .setColor(globals.embed.white)
            .setTimestamp()
            .setDescription(data.kage ? `<@${data.kage.id}> is the village Kage` : `No kage has been set yet`);

            await flow.send({
                embeds: [villageCreation]
            });

            // Send the base rules message
            const rulesMessage = new EmbedBuilder()
            .setTitle(`Village rules`)
            .setDescription(`No rules have been setup yet, wait for the village Kage to write the rules with the \`/village rules\` command`)
            .setColor(globals.embed.grey);

            await rules.send({
                embeds: [rulesMessage]
            });

            // Add the village into database
            await db.insert(`INSERT INTO village (tag, name, flow, rules, category, moderation, role_id, flow_incoming, flow_leave, flow_warn, flow_ban, flow_promote) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0)`, [
                data.tag,
                data.name,
                flow.id,
                rules.id,
                category.id,
                moderation.id,
                role.id
            ]);

            // Update the member village
            if(data.kage) {
                await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [data.tag, data.kage.id]);
                await nameUpdates.updateName(data.kage.id, interaction.guild);
            }

            // Send message in villages chat
            const villagesChat = await villageFlow.fetchChannel(interaction.guild, globals.server.channel.villages);
            if(villagesChat) await villagesChat.send({
                content: `[${data.tag}] ${data.name} has been created`
            });
        }

        async function deleteVillage(data, interaction) {
            // Checks
            if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await answer(interaction, `You don't have permissions to execute this command`);
            }

            const village = await db.getrow(`SELECT role_id, category, name, tag FROM village WHERE tag = ?`, [data.name]);
            if(!village) {
                return await answer(interaction, `Unknown village, pick it from the list`);
            }

            // Reply to interaction before it breaks
            await answer(interaction, `Village deleted`);

            // Delete the channels
            const category = await villageFlow.fetchChannel(interaction.guild, village.category);

            if(category) {
                for(const [, children] of category.children.cache) {
                    await children.delete();
                }

                await category.delete();
            }

            // get members with village role (fetch them all so the role members list is complete)
            await interaction.guild.members.fetch();
            const role = interaction.guild.roles.cache.get(village.role_id);

            const villageMembers = role ? [...role.members.values()] : [];

            if(role) {
                for(const member of villageMembers) {
                    // Remove kage and subkages
                    if(member.roles.cache.has(globals.server.role.sub)) await member.roles.remove(globals.server.role.sub);
                    if(member.roles.cache.has(globals.server.role.kage)) await member.roles.remove(globals.server.role.kage);

                    // Give lone ninja role
                    await member.roles.add(globals.server.role.lone);
                }

                // delete the role
                await role.delete();
            }

            // Delete the village from members village tag (also members who left the server)
            await db.update(`UPDATE member SET village_tag = NULL WHERE village_tag = ?`, [village.tag]);

            // Pending applications and Tri-Army Clash channels access (the role overwrites are removed with the role)
            await db.delete(`DELETE FROM application WHERE village_tag = ?`, [village.tag]);
            await db.delete(`DELETE FROM tac_village WHERE village_tag = ?`, [village.tag]);

            // Delete village from database
            await db.delete(`DELETE FROM village WHERE tag = ?`, [village.tag]);

            // Remove the village tag from members names
            for(const member of villageMembers) {
                await nameUpdates.updateName(member.id, interaction.guild);
            }

            // Send message in villages chat
            const villagesChat = await villageFlow.fetchChannel(interaction.guild, globals.server.channel.villages);
            if(villagesChat) await villagesChat.send({
                content: `[${village.tag}] ${village.name} has been deleted`
            });
        }

        async function renameVillage(data, interaction) {
            // Checks
            const executorVillage = await getExecutorVillage(interaction, `tag, category, name, role_id, flow`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const village = executorVillage.village;

            const tagReserved = await db.getrow(`SELECT name FROM village WHERE tag = ? AND tag <> ?`, [data.tag, village.tag]);
            if(tagReserved) {
                return await answer(interaction, `This tag is taken by ${tagReserved.name}`);
            }

            // Reply to interaction before it breaks
            await answer(interaction, `Village name edited`);

            // Edit role name
            const role = interaction.guild.roles.cache.get(village.role_id) ?? await interaction.guild.roles.fetch(village.role_id).catch(() => null);
            if(role) await role.edit({
                name: data.name
            });

            // Edit category name
            const category = await villageFlow.fetchChannel(interaction.guild, village.category);
            if(category) await category.setName(`${data.name}`);

            // Update database
            await db.update(`UPDATE village SET name = ?, tag = ? WHERE tag = ?`, [data.name, data.tag, village.tag]);
            await db.update(`UPDATE member SET village_tag = ? WHERE village_tag = ?`, [data.tag, village.tag]);
            await db.update(`UPDATE status SET village_tag = ? WHERE village_tag = ?`, [data.tag, village.tag]);
            await db.update(`UPDATE application SET village_tag = ? WHERE village_tag = ?`, [data.tag, village.tag]);
            await db.update(`UPDATE tac_village SET village_tag = ? WHERE village_tag = ?`, [data.tag, village.tag]);
            await db.update(`UPDATE tac_channel SET creator_tag = ? WHERE creator_tag = ?`, [data.tag, village.tag]);

            // Update the village tag in members names
            if(data.tag != village.tag) {
                for(const id of await db.getvals(`SELECT id FROM member WHERE village_tag = ?`, [data.tag])) {
                    await nameUpdates.updateName(id, interaction.guild);
                }
            }

            // Send message in flow
            const flowEmbed = new EmbedBuilder()
            .setTitle(`Village renamed`)
            .setDescription(`The village has been renamed to [${data.tag}] ${data.name}`)
            .setColor(globals.embed.purple)
            .setTimestamp()

            const flow = await villageFlow.fetchChannel(interaction.guild, village.flow);
            if(flow) await flow.send({
                embeds: [flowEmbed]
            });
        }

        async function subKageManage(data, interaction) {
            // Checks
            const executorVillage = await getExecutorVillage(interaction, `tag, flow, moderation, flow_promote`);
            const target = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.member.id]);

            if(!executorVillage || !target || !target.village_tag || target.village_tag != executorVillage.executor.village_tag) {
                return await answer(interaction, `This member is not from your village`);
            }
            const village = executorVillage.village;

            // Check if the executor is kage
            if(!interaction.member.roles.cache.has(globals.server.role.kage)) {
                return await answer(interaction, `You must be Kage to promote or demote members`);
            }

            const member = await villageFlow.fetchMember(interaction.guild, data.member.id);
            if(!member) {
                return await answer(interaction, `This member is not in the server`);
            }

            // Reply to interaction before it breaks
            await answer(interaction, `Promotion/Demotion successful`);

            // Fetch moderation channel
            const moderation = await villageFlow.fetchChannel(interaction.guild, village.moderation);

            // Prepare embed
            const flowEmbed = new EmbedBuilder()
            .setTimestamp();

            // Promote or demote
            if(member.roles.cache.has(globals.server.role.sub)) {
                await member.roles.remove(globals.server.role.sub);

                if(moderation) await moderation.permissionOverwrites.edit(data.member.id, {
                    ViewChannel: false
                });

                flowEmbed
                .setTitle(`A member has been demoted`)
                .setDescription(`<@${data.member.id}> lost his/her sub kage position`)
                .setColor(globals.embed.red);
            } else {
                await member.roles.add(globals.server.role.sub);

                if(moderation) await moderation.permissionOverwrites.edit(data.member.id, {
                    ViewChannel: true
                });

                flowEmbed
                .setTitle(`A member has been promoted`)
                .setDescription(`<@${data.member.id}> got a sub kage position`)
                .setColor(globals.embed.green);
            }

            // Send flow message
            await villageFlow.sendLog(interaction.guild, village, village.flow_promote, { embeds: [flowEmbed] });
        }

        async function inviteToVillage(data, interaction) {
            // Checks
            const executorVillage = await getExecutorVillage(interaction, `name, tag`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const village = executorVillage.village;

            const hasVillage = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.member.id]);
            if(hasVillage && hasVillage.village_tag) {
                return await answer(interaction, `This member is already in a village`);
            }

            // Reply to interaction before it breaks
            await answer(interaction, `Player invited`);

            // Generate buttons
            const accept = new ButtonBuilder()
            .setCustomId(`invite${globals.separator}a${globals.separator}${data.member.id}${globals.separator}${village.tag}`)
            .setLabel(`Accept`)
            .setStyle(ButtonStyle.Success);

            const deny = new ButtonBuilder()
            .setCustomId(`invite${globals.separator}d${globals.separator}${data.member.id}${globals.separator}${village.tag}`)
            .setLabel(`Deny`)
            .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
            .addComponents(accept, deny);

            // Send message in villages
            const villagesChannel = await villageFlow.fetchChannel(interaction.guild, globals.server.channel.villages);
            if(villagesChannel) await villagesChannel.send({
                content: `<@${data.member.id}>, you have been invited to **[${village.tag}] ${village.name}**`,
                components: [row]
            });
        }

        async function editRules(data, interaction) {
            const executorVillage = await getExecutorVillage(interaction, `tag, rules_message`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const village = executorVillage.village;

            const modal = new ModalBuilder()
            .setCustomId(`villageRules${globals.separator}${village.tag}`)
            .setTitle(`Village rules`);

            const input = new TextInputBuilder()
            .setCustomId(`rulesContent`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setValue(village.rules_message ? village.rules_message : " ");

            const label = new LabelBuilder()
            .setLabel(`rules`)
            .setDescription(`Rules messagge - CLICK ON SUBMIT WHEN YOU'RE DONE OR THE CONTENT WILL NOT SAVE`)
            .setTextInputComponent(input)

            modal.addLabelComponents(label);

            await interaction.showModal(modal);
        }

        async function recolorVillage(data, interaction) {
            const executorVillage = await getExecutorVillage(interaction, `role_id`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }

            const hexColor = /^#?[0-9a-f]{6}$/i;
            if(!hexColor.test(data.color) || (data.color2 && !hexColor.test(data.color2))) {
                return await answer(interaction, `The color must be an hexadecimal value like #ff8800`);
            }

            const role = interaction.guild.roles.cache.get(executorVillage.village.role_id) ?? await interaction.guild.roles.fetch(executorVillage.village.role_id).catch(() => null);
            if(!role) {
                return await answer(interaction, `The village role couldn't be found`);
            }

            const toHex = (color) => `#${color.replace("#", "")}`;

            try {
                if(data.color2) {
                    await role.setColors({
                        primaryColor: toHex(data.color),
                        secondaryColor: toHex(data.color2)
                    });
                } else {
                    await role.setColors({
                        primaryColor: toHex(data.color)
                    });
                }
            } catch(error) {
                console.error(error);
                return await answer(interaction, `The color couldn't be updated${data.color2 ? `, the server may not allow gradient role colors` : ``}`);
            }

            return await answer(interaction, `Color updated`);
        }

        async function status(data, interaction) {

            const action = interaction.options.getSubcommand();
            const executorVillage = await getExecutorVillage(interaction, `flow, moderation, flow_warn, flow_ban, role_id, tag`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const village = executorVillage.village;

            let description = "";

            if(action == "unban") {
                // Check if the member is banned
                const toUnban = await db.getrow(`SELECT member_name, member_id FROM status WHERE status = 'ban' AND member_id = ? AND village_tag = ? LIMIT 1`, [data.id, village.tag]);
                if(!toUnban) {
                    return await answer(interaction, `This member is not banned`);
                }

                await answer(interaction, `member unbanned`);

                await db.delete(`DELETE FROM status WHERE member_id = ? AND village_tag = ? AND status = 'ban'`, [data.id, village.tag]);

                description += `${toUnban.member_name} (${toUnban.member_id}) has been unbanned.`;
            } else {
                const target = await db.getrow(`SELECT id, name, village_tag FROM member WHERE name = ?`, [data.name]);

                // Check if member is already banned
                if(action == "ban") {
                    const checkStatus = await db.getrow(`SELECT date FROM status WHERE village_tag = ? AND member_id = ? AND status = ? LIMIT 1`, [village.tag, data.id, action]);
                    if(checkStatus) {
                        return await answer(interaction, `This member is already banned`);
                    }
                }

                // Check if member is in the village
                if(target && target.village_tag != village.tag) {
                    return await answer(interaction, `This member is not in the village`);
                }

                // Check if targeted member is subkage or kage
                const targetMember = target ? await villageFlow.fetchMember(interaction.guild, target.id) : null;
                if(action == "ban" && targetMember && targetMember.roles.cache.has(globals.server.role.sub)) {
                    return await answer(interaction, `You can't ban a subkage or kage`);
                }

                await answer(interaction, `member ${action == "ban" ? "bann" : "warn"}ed`);

                // Update database
                await db.insert(`INSERT INTO status (member_id, member_name, status, date, reason, village_tag) VALUES (?, ?, ?, CURDATE(), ?, ?)`, [
                    data.id,
                    data.name,
                    action,
                    data.reason,
                    village.tag
                ]);

                // Remove the member from village if he's in the discord server
                if(target && action == "ban") {
                    await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [target.id]);

                    if(targetMember) {
                        await targetMember.roles.remove(village.role_id);
                        await targetMember.roles.add(globals.server.role.lone);
                        await nameUpdates.updateName(target.id, interaction.guild);
                    }
                }

                description += `${data.name} (${data.id}) has been ${action == "ban" ? "banned" : "warned"}`;
            }

            description += (data.reason) ? `\nReason: ${data.reason}` : `\nNo reason given`;

            const embed = new EmbedBuilder()
            .setTitle(`${action == "unban" ? `Unban` : `New ${action}`}`)
            .setTimestamp()
            .setColor(globals.embed.orange)
            .setAuthor({name: `${interaction.member.displayName ?? interaction.user.username}`})
            .setDescription(description);

            // Send message
            await villageFlow.sendLog(interaction.guild, village, action == "warn" ? village.flow_warn : village.flow_ban, { embeds: [embed] });
        }

        async function statusList(data, interaction) {
            await lists.statusList(interaction, -1, "n", data.type, data.id);
        }

        async function kick(data, interaction) {
            const executorVillage = await getExecutorVillage(interaction, `flow, moderation, flow_leave, role_id, tag`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const village = executorVillage.village;

            const target = await db.getrow(`SELECT id, name, village_tag FROM member WHERE id = ?`, [data.member.id]);

            // Check if member is in the village
            if(!target || target.village_tag != village.tag) {
                return await answer(interaction, `This member is not in the village`);
            }

            // Confirmation message
            await answer(interaction, `member kicked`);

            const embed = new EmbedBuilder()
            .setTitle(`Kick`)
            .setTimestamp()
            .setColor(globals.embed.orange)
            .setAuthor({name: `${interaction.member.displayName ?? interaction.user.username}`})
            .setDescription(`${target.name ?? `<@${target.id}>`} has been kicked out`);

            // Send message
            await villageFlow.sendLog(interaction.guild, village, village.flow_leave, { embeds: [embed] });

            await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [target.id]);

            const targetMember = await villageFlow.fetchMember(interaction.guild, target.id);
            if(targetMember) {
                await targetMember.roles.remove(village.role_id);
                await targetMember.roles.add(globals.server.role.lone);
                await villageFlow.removeVillageRanks(interaction.guild, targetMember, village);
                await nameUpdates.updateName(target.id, interaction.guild);
            }
        }

        async function renameMember(data, interaction) {
            const executorVillage = await getExecutorVillage(interaction, `tag`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }

            const target = await db.getrow(`SELECT id, name, village_tag FROM member WHERE id = ?`, [data.member.id]);

            // Check if member is in the village
            if(!target || target.village_tag != executorVillage.village.tag) {
                return await answer(interaction, `This member is not in the village`);
            }

            await db.update(`UPDATE member SET name = ? WHERE id = ?`, [data.name, target.id]);

            // Update the name in discord
            await nameUpdates.updateName(target.id, interaction.guild);

            await answer(interaction, `name changed`);
        }

        // Category of the Tri-Army Clash channels
        async function getTacCategory(guild) {
            //const categoryId = globals.server.channel.tacCategory;
            const categoryId = "1573639980964913162";
            const categoryName = `⚔️ Tri-Army Clash`;

            if(categoryId) {
                const category = await villageFlow.fetchChannel(guild, categoryId);
                if(category) return category;
            }

            const existing = guild.channels.cache.find(c => c.type == ChannelType.GuildCategory && c.name == categoryName);
            if(existing) return existing;

            return await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
            });
        }

        async function tacCreate(interaction) {
            // Checks
            const executorVillage = await getExecutorVillage(interaction, `tag, name, role_id`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }
            const ownVillage = executorVillage.village;

            if(!interaction.member.roles.cache.has(globals.server.role.kage)) {
                return await answer(interaction, `Only the Kage can create a Tri-Army Clash channel`);
            }

            const tags = [...new Set([1, 2, 3, 4, 5]
                .map(k => interaction.options.getString(`village${k}`))
                .filter(Boolean)
                .map(tag => tag.toUpperCase()))]
                .filter(tag => tag != ownVillage.tag);

            if(tags.length == 0) {
                return await answer(interaction, `Pick at least one other village`);
            }

            const villages = [ownVillage];
            for(const tag of tags) {
                const village = await db.getrow(`SELECT tag, name, role_id FROM village WHERE tag = ?`, [tag]);
                if(!village) {
                    return await answer(interaction, `Unknown village : ${tag}, pick it from the list`);
                }
                villages.push(village);
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Create the channel, visible by the members of every village
            const category = await getTacCategory(interaction.guild);
            const memberPermissions = [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AddReactions,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks
            ];

            const channel = await interaction.guild.channels.create({
                name: interaction.options.getString("name") ?? `tac ${villages.map(v => v.tag).join(" ")}`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.client.user.id, allow: memberPermissions },
                    ...villages.map(v => ({ id: v.role_id, allow: memberPermissions }))
                ]
            });

            await db.insert(`INSERT INTO tac_channel (id, creator_tag, creator_id) VALUES (?, ?, ?)`, [channel.id, ownVillage.tag, interaction.user.id]);
            for(const village of villages) {
                await db.insert(`INSERT INTO tac_village (channel_id, village_tag) VALUES (?, ?)`, [channel.id, village.tag]);
            }

            const embed = new EmbedBuilder()
            .setTitle(`Tri-Army Clash`)
            .setDescription(`Shared channel of the villages in the same Tri-Army Clash :\n${villages.map(v => `- **[${v.tag}]** ${v.name}`).join("\n")}\n\nCreated by <@${interaction.user.id}>. It stays until the Kage of [${ownVillage.tag}] or a moderator deletes it with \`/village tac delete\``)
            .setColor(globals.embed.purple)
            .setTimestamp();

            await channel.send({
                content: villages.map(v => `<@&${v.role_id}>`).join(" "),
                embeds: [embed]
            });

            await interaction.editReply({
                content: `Tri-Army Clash channel created : <#${channel.id}>`
            });
        }

        async function tacDelete(interaction) {
            const tac = await db.getrow(`SELECT * FROM tac_channel WHERE id = ?`, [interaction.options.getString("channel")]);
            if(!tac) {
                return await answer(interaction, `Unknown Tri-Army Clash channel, pick it from the list`);
            }

            const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers);
            const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const isCreatorKage = executor?.village_tag == tac.creator_tag && interaction.member.roles.cache.has(globals.server.role.kage);

            if(!isModerator && !isCreatorKage) {
                return await answer(interaction, `Only the Kage of [${tac.creator_tag}] or a moderator can delete this channel`);
            }

            await answer(interaction, `Tri-Army Clash channel deleted`);

            await db.delete(`DELETE FROM tac_village WHERE channel_id = ?`, [tac.id]);
            await db.delete(`DELETE FROM tac_channel WHERE id = ?`, [tac.id]);

            const channel = await villageFlow.fetchChannel(interaction.guild, tac.id);
            if(channel) await channel.delete();
        }

        async function ping(interaction) {
            const executorVillage = await getExecutorVillage(interaction, `role_id`);
            if(!executorVillage) {
                return await answer(interaction, `You are not in a village`);
            }

            await interaction.channel.send({
                content: `<@&${executorVillage.village.role_id}>`
            });

            await answer(interaction, `ok`);
        }
    }
}
