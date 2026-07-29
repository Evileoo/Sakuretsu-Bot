import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, ChannelType, PermissionOverwrites, Embed, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, ButtonComponent } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { lists } from '../functions/lists.js';

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
        )
        .addStringOption( (option) =>
            option
            .setName("tag")
            .setDescription("In game village tag")
            .setRequired(true)
        )
        .addUserOption( (option) =>
            option
            .setName("kage")
            .setDescription("Village Kage")
            .setRequired(true)
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
        )
        .addStringOption( (option) =>
            option
            .setName("tag")
            .setDescription("New village tag")
            .setRequired(true)
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
        .setName("help")
        .setDescription("Get help on village commands")
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
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("In-game name")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("Ban reason")
            .setRequired(true)
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
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("In-game name")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("Warn reason")
            .setRequired(true)
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
    , async execute(interaction){

        // Get all command data
        const data = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            tag: (interaction.options.getString("tag")) ? interaction.options.getString("tag") : null,
            kage: (interaction.options.getUser("kage")) ? interaction.options.getUser("kage") : null,
            member: (interaction.options.getUser("member")) ? interaction.options.getUser("member") : null,
            color: (interaction.options.getString("color")) ? interaction.options.getString("color") : null,
            color2: (interaction.options.getString("second")) ? interaction.options.getString("second") : null,
            id: (interaction.options.getString("id")) ? interaction.options.getString("id") : null,
            reason: (interaction.options.getString("reason")) ? interaction.options.getString("reason") : null,
            type: (interaction.options.getString("type")) ? interaction.options.getString("type") : null
        }

        switch(interaction.options.getSubcommand()) {
            case "create":
                createVillage(data, interaction);
            break;
            case "delete":
                deleteVillage(data, interaction);
            break;
            case "rename":
                renameVillage(data, interaction);
            break;
            case "subkage":
                subKageManage(data, interaction);
            break;
            case "invite":
                inviteToVillage(data, interaction);
            break;
            case "rules":
                editRules(data, interaction);
            break;
            case "recolor":
                recolorVillage(data, interaction);
            break;
            case "help":
                helper(interaction);
            break;
            case "ban":
            case "unban":
            case "warn":
                status(data, interaction);
            break;
            case "sanctions":
                statusList(data, interaction);
            break;
            case "kick":
                kick(data, interaction);
            break;
            default:
            break;
        }

        async function createVillage(data, interaction) {
            // Checks
            if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await interaction.reply({
                    content: `You don't have permissions to execute this command`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const accountCreated = await db.getrow(`SELECT name FROM member WHERE id = ?`, [data.kage.id]);
            if(!accountCreated) {
                const member = await interaction.guild.members.cache.get(data.kage.id);
                await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [data.kage.id, member.displayName ?? data.kage.username]);
            }

            const inVillage = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.kage.id]);
            if(inVillage.village_tag != null) {
                return await interaction.reply({
                    content: `<@${data.kage.id}> is already in a village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const tagTaken = await db.getrow(`SELECT name FROM village WHERE tag = ?`, [data.tag]);
            if(tagTaken) {
                return await interaction.reply({
                    content: `An existing village already has this tag`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Send the message before interaction breaks
            await interaction.reply({
                content: `Village created`,
                flags: MessageFlags.Ephemeral
            });

            // Create the role
            const role = await interaction.guild.roles.create({
                name: `${data.name}`,
                reason: `${data.tag} ${data.name}`
            });
            await role.setHoist(true);

            // Create the category
            const category = await interaction.guild.channels.create({
                name: `${data.name}`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: await interaction.guild.roles.cache.find(r => r.name === '@everyone'),
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
            flow.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });

            const rules = await interaction.guild.channels.create({
                name: `rules`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            rules.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });

            const announcements = await interaction.guild.channels.create({
                name: `announcements`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            announcements.permissionOverwrites.edit(role.id, {
                SendMessages: false
            });
            announcements.permissionOverwrites.edit(globals.server.role.sub, {
                SendMessages: true
            });

            const general = await interaction.guild.channels.create({
                name: `general`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            general.permissionOverwrites.edit(globals.server.role.kage, {
                ManageMessages: true
            });

            const moderation = await interaction.guild.channels.create({
                name: `moderation`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            moderation.permissionOverwrites.edit(role.id, {
                ViewChannel: false
            });
            moderation.permissionOverwrites.edit(data.kage.id, {
                ViewChannel: true
            });

            // Edit Kage roles
            const kage = interaction.guild.roles.cache.get(globals.server.role.kage);
            const sub = interaction.guild.roles.cache.get(globals.server.role.sub);
            const lone = interaction.guild.roles.cache.get(globals.server.role.lone);

            interaction.guild.members.cache.get(data.kage.id).roles.add(role);
            interaction.guild.members.cache.get(data.kage.id).roles.add(kage);
            interaction.guild.members.cache.get(data.kage.id).roles.add(sub);
            interaction.guild.members.cache.get(data.kage.id).roles.remove(lone);

            // Create the panel in moderation for village flow messages
            const flowPanel = new EmbedBuilder()
            .setTitle(`Flow messages Manager`)
            .setDescription(`This panel allows or disallows a log message to be sent in <#${flow.id}>\nIf the button is green, the message will send when the evenement will occur, if red, it won't send the message\n\nNB: The command \`/village help\` is available at any moment if you want to learn the commands`)
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
            .setDescription(`<@${data.kage.id}> is the village Kage`)
            .setColor(globals.embed.white)
            .setTimestamp();

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
            await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [data.tag, data.kage.id]);
        
            // Send message in villages chat
            const villagesChat = await interaction.guild.channels.cache.get(globals.server.channel.villages);
            await villagesChat.send({
                content: `[${data.tag}] ${data.name} has been created`
            });
        }

        async function deleteVillage(data, interaction) {
            // Checks
            if(!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await interaction.reply({
                    content: `You don't have permissions to execute this command`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Reply to interaction before it breaks
            await interaction.reply({
                content: `Village deleted`,
                flags: MessageFlags.Ephemeral
            });


            // Delete the channels
            const village = await db.getrow(`SELECT role_id, category, name, tag FROM village WHERE tag = ?`, [data.name]);

            const category = await interaction.guild.channels.cache.get(village.category);

            for(const children of await category.children.cache) {
                await children[1].delete();
            }

            await category.delete();

            // get members with village role
            const role = interaction.guild.roles.cache.get(village.role_id);
            const members = role.members;
            
            
            for(const member of members) {
                // Remove kage and subkages
                if(member[1].roles.cache.has(globals.server.role.sub)) {
                    await member[1].roles.remove(globals.server.role.sub);
                    if(member[1].roles.cache.has(globals.server.role.kage)) {
                        await member[1].roles.remove(globals.server.role.kage);
                    }
                }

                // Give lone ninja role
                await member[1].roles.add(globals.server.role.lone);

                // Delete the village from members village tag
                await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [member[1].id]);
            }

            // delete the role
            await role.delete();

            // Delete village from database
            await db.delete(`DELETE FROM village WHERE tag = ?`, [data.name]);

            // Send message in villages chat
            const villagesChat = await interaction.guild.channels.cache.get(globals.server.channel.villages);
            await villagesChat.send({
                content: `[${village.tag}] ${village.name} has been deleted`
            });
        }

        async function renameVillage(data, interaction) {
            // Checks
            const tagReserved = await db.getrow(`SELECT name FROM village WHERE tag = ?`, [data.tag]);

            if(tagReserved) {
                return await interaction.reply({
                    content: `This tag is taken by ${tagReserved.name}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Reply to interaction before it breaks
            await interaction.reply({
                content: `Village name edited`,
                flags: MessageFlags.Ephemeral
            });

            // Edit role name
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const village = await db.getrow(`SELECT category, name, role_id, flow FROM village WHERE tag = ?`, [member.village_tag]);

            const role = await interaction.guild.roles.cache.get(village.role_id);
            role.edit({
                name: data.name
            });

            // Edit category name
            const category = await interaction.guild.channels.cache.get(village.category);
            category.setName(`${data.name}`);

            // Update database
            await db.update(`UPDATE village SET name = ?, tag = ? WHERE tag = ?`, [data.name, data.tag, member.village_tag]);
            await db.update(`UPDATE member SET village_tag = ? WHERE village_tag = ?`, [data.tag, member.village_tag]);

            // Send message in flow
            const flowEmbed = new EmbedBuilder()
            .setTitle(`Village renamed`)
            .setDescription(`The village has been renamed to [${data.tag}] ${data.name}`)
            .setColor(globals.embed.purple)
            .setTimestamp()

            const flow = await interaction.guild.channels.cache.get(village.flow);
            flow.send({
                embeds: [flowEmbed]
            });
        }

        async function subKageManage(data, interaction) {
            // Checks
            const target = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.member.id]);
            const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const village = await db.getrow(`SELECT moderation FROM village WHERE tag = ?`, [executor.village_tag]);
            
            if(!target || !target.village_tag || target.village_tag != executor.village_tag) {
                return await interaction.reply({
                    content: `This member is not from your village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Reply to interaction before it breaks
            await interaction.reply({
                content: `Promotion/Demotion successful`,
                flags: MessageFlags.Ephemeral
            });

            // Fetch moderation channel
            const moderation = await interaction.guild.channels.cache.get(village.moderation);

            // Prepare embed
            const flowEmbed = new EmbedBuilder()
            .setTimestamp();

            // Promote or demote
            const member = await interaction.guild.members.cache.get(data.member.id);
            if(member.roles.cache.has(globals.server.role.sub)) {
                member.roles.remove(globals.server.role.sub);

                moderation.permissionOverwrites.edit(data.member.id, {
                    ViewChannel: false
                });

                flowEmbed
                .setTitle(`A member has been demoted`)
                .setDescription(`<@${data.member.id}> lost his/her sub kage position`)
                .setColor(globals.embed.red);
            } else {
                member.roles.add(globals.server.role.sub);

                moderation.permissionOverwrites.edit(data.member.id, {
                    ViewChannel: true
                });

                flowEmbed
                .setTitle(`A member has been promoted`)
                .setDescription(`<@${data.member.id}> got a sub kage position`)
                .setColor(globals.embed.green);
            }
            
            // Send flow message
            const villageChannel = await interaction.guild.channels.cache.get(village.flow);
            
            await villageChannel.send({
                embeds: [flowEmbed]
            });
        }

        async function inviteToVillage(data, interaction) {
            // Checks
            const hasVillage = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [data.member.id]);
            if(hasVillage && hasVillage.village_tag) {
                return await interaction.reply({
                    content: `This member is already in a village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Reply to interaction before it breaks
            await interaction.reply({
                content: `Player invited`,
                flags: MessageFlags.Ephemeral
            });

            // Generate buttons
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);

            const accept = new ButtonBuilder()
            .setCustomId(`invite${globals.separator}a${globals.separator}${data.member.id}${globals.separator}${member.village_tag}`)
            .setLabel(`Accept`)
            .setStyle(ButtonStyle.Success);

            const deny = new ButtonBuilder()
            .setCustomId(`invite${globals.separator}d${globals.separator}${data.member.id}${globals.separator}${member.village_tag}`)
            .setLabel(`Deny`)
            .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
            .addComponents(accept, deny);

            // Send message in villages
            const village = await db.getrow(`SELECT name, tag FROM village where tag = ?`, [member.village_tag]);
            const villagesChannel = await interaction.guild.channels.cache.get(globals.server.channel.villages);
            villagesChannel.send({
                content: `<@${data.member.id}>, you have been invited to **[${village.tag}] ${village.name}**`,
                components: [row]
            })
        }

        async function editRules(data, interaction) {

            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const village = await db.getrow(`SELECT tag, rules_message FROM village WHERE tag = ?`, [member.village_tag]);

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
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const village = await db.getrow(`SELECT role_id FROM village where tag = ?`, [member.village_tag]);

            const role = await interaction.guild.roles.cache.get(village.role_id);

            if(typeof color2 !== 'undefined') {
                role.setColors({
                    primaryColor: data.color,
                    secondaryColor: data.color2
                });
            } else {
                role.setColors({
                    primaryColor: data.color
                });
            }

            return await interaction.reply({
                content: `Color updated`,
                flags: MessageFlags.Ephemeral
            });
            
        }

        async function helper(interaction) {
            const embed = new EmbedBuilder()
            .setTitle(`Helper`)
            .setDescription(`Click the button related to the command you want help on`)
            .setTimestamp()
            .setColor(globals.embed.yellow)

            const renameButton = new ButtonBuilder()
            .setCustomId(`villageHelp${globals.separator}n`)
            .setLabel(`rename`)
            .setStyle(ButtonStyle.Secondary);

            const subkageButton = new ButtonBuilder()
            .setCustomId(`villageHelp${globals.separator}s`)
            .setLabel(`subkage`)
            .setStyle(ButtonStyle.Secondary);

            const inviteButton = new ButtonBuilder()
            .setCustomId(`villageHelp${globals.separator}i`)
            .setLabel(`invite`)
            .setStyle(ButtonStyle.Secondary);

            const rulesButton = new ButtonBuilder()
            .setCustomId(`villageHelp${globals.separator}r`)
            .setLabel(`rules`)
            .setStyle(ButtonStyle.Secondary);

            const recolorButton = new ButtonBuilder()
            .setCustomId(`villageHelp${globals.separator}c`)
            .setLabel(`recolor`)
            .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
            .addComponents(renameButton, subkageButton, inviteButton, rulesButton, recolorButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        }

        async function status(data, interaction) {
            
            const executor = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            const action = await interaction.options.getSubcommand();
            const village = await db.getrow(`SELECT flow, moderation, flow_warn, flow_ban, role_id, tag FROM village WHERE tag = ?`, [executor.village_tag]);
            const target = await db.getrow(`SELECT id, name, village_tag FROM member WHERE name = ?`, [data.name]);
            
            // Check if member is already banned
            if(action == "ban") {
                const checkStatus = await db.getrow(`SELECT date FROM status WHERE village_tag = ? AND member_id = ? AND status = ? LIMIT 1`, [village.tag, data.id, action]);
                if(checkStatus) {
                    return await interaction.reply({
                        content: `This member is already banned`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Check if member is in the village
            if(target && target.village_tag != executor.village_tag) {
                return await interaction.reply({
                    content: `This member is not in the village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.reply({
                content: `member ${action == "ban" ? "bann" : "warn"}ed`,
                flags: MessageFlags.Ephemeral
            });

            // Update database
            switch(action) {
                case "ban":
                case "warn":
                    await db.insert(`INSERT INTO status (member_id, member_name, status, date, reason, village_tag) VALUES (?, ?, ?, CURDATE(), ?, ?)`, [
                        data.id,
                        data.name,
                        action,
                        data.reason,
                        executor.village_tag
                    ]);
                break;
                case "unban":
                    await db.delete(`DELETE FROM status WHERE member_id = ? AND village_tag = ? AND status = ?`, [data.id, executor.tag, "ban"]);
                break;
            }

            const embed = new EmbedBuilder()
            .setTitle(`${action == "unban" ? `Unban` : `New ${action}`}`)
            .setTimestamp()
            .setColor(globals.embed.orange)
            .setAuthor({name: `${interaction.member.displayName ?? interaction.user.username}`}); 

            let description = "";
            if(action == "unban") {
                const toUnban = await db.getrow(`SELECT member_name, member_id FROM status WHERE status = ? AND member_id = ? AND village_tag = ?`, [action, data.id, executor.village_tag]);
                description += `${toUnban.member_name} (${toUnban.member_id}) has been unbanned.`;
            } else {
                description += `${data.name} (${data.id}) has been ${action == "ban" ? "banned" : "warned"}`;
            }
            description += (data.reason) ? `\nReason: ${data.reason}` : `\nNo reason given`;
            embed.setDescription(description);

            // Send message
            let channel;
            if((action == "ban" && village.flow_ban == 0) || (action == "unban" && village.flow_ban == 0) || (action == "warn" && village.flow_warn == 0)) {
                channel = interaction.guild.channels.cache.get(village.flow);
            } else {
                channel = interaction.guild.channels.cache.get(village.moderation);
            }

            channel.send({
                embeds: [embed]
            });

            // Remove the member from village if he's in the discord server
            if(target && action == "ban") {
                await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [data.member.id]);
                await interaction.guild.members.cache.get(target.id).roles.remove(village.role_id);
            }
        }

        async function statusList(data, interaction) {
            const channel = interaction.channel;

            const message = await channel.send({
                content: `loading...`
            });

            await interaction.reply({
                content: `ok`,
                flags: MessageFlags.Ephemeral
            });

            await lists.statusList(interaction, -1, "n", data.type, data.id, message.id);
        }

        async function kick(data, interaction) {
            const village = await db.getrow(`SELECT flow, moderation, flow_warn, flow_ban, role_id, tag FROM village WHERE tag = ?`, [executor.village_tag]);
            const target = await db.getrow(`SELECT id, name, village_tag FROM member WHERE name = ?`, [data.name]);

            // Check if member is in the village
            if(target && target.village_tag != executor.village_tag) {
                return await interaction.reply({
                    content: `This member is not in the village`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Confirmation message
            await interaction.reply({
                content: `member kicked`,
                flags: MessageFlags.Ephemeral
            });

            const embed = new EmbedBuilder()
            .setTitle(`Kick`)
            .setTimestamp()
            .setColor(globals.embed.orange)
            .setAuthor({name: `${interaction.member.displayName ?? interaction.user.username}`})
            .setDescription(`${target.name} has been kicked out`);

            // Send message
            let channel;
            if(village.flow_ban == 0) {
                channel = interaction.guild.channels.cache.get(village.flow);
            } else {
                channel = interaction.guild.channels.cache.get(village.moderation);
            }

            channel.send({
                embeds: [embed]
            });

            await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [data.member.id]);
            await interaction.guild.members.cache.get(target.id).roles.remove(village.role_id);
        }
    }
}