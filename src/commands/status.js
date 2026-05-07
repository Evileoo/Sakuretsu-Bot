import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { managementLog } from '../functions/managementLog.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Manage members status")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add a status to a member")
        .addStringOption( (option) =>
            option
            .setName("type")
            .setDescription("type of status to apply")
            .setRequired(true)
            .addChoices(
                { name: "warn", value: "warn" },
                { name: "ban", value: "ban" }
            )
        )
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(false)
        )
        .addStringOption( (option) =>
            option
            .setName("reason")
            .setDescription("The reason why you give this status")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("list")
        .setDescription("List of members with a status")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("sort")
            .setDescription("sort by a type of status")
            .setRequired(false)
            .addChoices(
                { name: "warn", value: "warn" },
                { name: "ban", value: "ban" }
            )
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("Remove a status to a member")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("type")
            .setDescription("the type of status to remove")
            .setRequired(true)
            .addChoices(
                { name: "warn", value: "warn" },
                { name: "ban", value: "ban" }
            )
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("rename")
        .setDescription("Rename a member with a status")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Edit member's name")
            .setRequired(true)
        )
    )
    .addSubcommandGroup( (subcommandgroup) =>
        subcommandgroup
        .setName("edit")
        .setDescription("Edit a member status")
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("ban")
            .setDescription("Edit ban data")
            .addIntegerOption( (option) =>
                option
                .setName("id")
                .setDescription("member ID")
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption( (option) =>
                option
                .setName("reason")
                .setDescription("Edit ban reason")
                .setRequired(true)
            )
        )
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("warn")
            .setDescription("Edit warn data")
            .addIntegerOption( (option) =>
                option
                .setName("id")
                .setDescription("member ID")
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption( (option) =>
                option
                .setName("reason")
                .setDescription("Edit warn reason")
                .setRequired(true)
            )
        )
    )
    , async execute(interaction){

        // Get all command data
        const add = (interaction.options.getSubcommand() != "add") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            type: (interaction.options.getString("type")) ? interaction.options.getString("type") : null,
            reason: (interaction.options.getString("reason")) ? interaction.options.getString("reason") : null,
            color: 0x000000
        }

        const list = (interaction.options.getSubcommand() != "list") ? null : {
            type: (interaction.options.getString("sort")) ? interaction.options.getString("sort") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null
        }

        const remove = (interaction.options.getSubcommand() != "remove") ? null : {
            type: (interaction.options.getString("type")) ? interaction.options.getString("type") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            color: 0x000000
        }

        const rename = (interaction.options.getSubcommand() != "rename") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            color: 0x47cffc
        }

        const edit = (interaction.options.getSubcommandGroup() != "edit") ? null : {
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            reason: (interaction.options.getString("reason")) ? interaction.options.getString("reason") : null,
            color: 0x3c5c52
        }


        switch(interaction.options.getSubcommand()){
            case "add":
                switch(add.type) {
                    case "warn":
                        add.color = 0xeba352;
                    break;
                    case "ban":
                        add.color = 0xeb6952;
                    break;
                }

                await addStatus(add, interaction);

                await interaction.reply({
                    content: `${add.type} status added to ${(add.name) ? add.name : ''}(${add.id})`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "list":
                const statusList = await listStatus(list, interaction);

                if(statusList.length == 0) {
                    return await interaction.reply({
                        content: `No result`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Create discord embed
                const embed = new EmbedBuilder()
                .setTitle(`List`)
                .setTimestamp()

                let nameIdList = "";
                let typeList = "";
                let reasonList = "";

                for(const s of statusList) {
                    nameIdList += (s.member_name) ? `${s.member_name} (${s.member_id})\n` : `${s.member_id}\n`;
                    typeList += (s.status) ? `${s.status}\n` : `-\n`;
                    reasonList += (s.reason) ? `${s.reason}\n` : `-\n`;
                }

                embed.addFields({name: `Name (ID)`, value: `${nameIdList}`, inline: true});
                embed.addFields({name: `Type`, value: `${typeList}`, inline: true});
                embed.addFields({name: `Reason`, value: `${reasonList}`, inline: true});

                await interaction.reply({
                    embeds: [embed]
                });

            break;
            case "remove":
                switch(remove.type) {
                    case "warn":
                        remove.color = 0xeba352;
                    break;
                    case "ban":
                        remove.color = 0xeb6952;
                    break;
                }

                const member = await removeStatus(remove, interaction);

                await interaction.reply({
                    content: `${remove.type} status removed from ${member.member_name}(${remove.id})`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "rename":
                const memberToRename = await renameMember(rename, interaction);

                await interaction.reply({
                    content: `${memberToRename.member_name}(${rename.id}) has been renamed to ${rename.name}`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            case "ban":
            case "warn":
                if(interaction.options.getSubcommandGroup() != "edit") break;

                await editReason(edit, interaction.options.getSubcommand(), interaction);

                await interaction.reply({
                    content: `Reason edited`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            default:
            break;
        }

        async function addStatus(data, interaction) {
            
            // Check if the member already has this status
            const checkStatus = await db.getrow('SELECT reason FROM status WHERE member_id = ? AND status = ?', [data.id, data.type]);

            if(checkStatus) {
                return await interaction.reply({
                    content: `${data.name}(${data.id}) already took a ${data.type} with the reason "${checkStatus.reason}"`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.insert('INSERT INTO status (member_id, member_name, status, date, reason) VALUES (?, ?, ?, CURDATE(), ?)', [data.id, data.name, data.type, data.reason]);

            const message = {
                title: `New ${data.type}`,
                author: `${interaction.user.username}`,
                color: data.color,
                description: ``
            };

            message.description += (data.name) ? `${data.name} (${data.id}) took a ${data.type}.\n` : `${data.id} took a ${data.type}.\n`
            message.description += (data.reason) ? `Reason: ${data.reason}` : `No reason given`;
            
            await managementLog.sendMessage(message, interaction.client);
        }

        async function removeStatus(data, interaction) {
            
            // Check if the member already has this status
            const checkStatus = await db.getrow('SELECT member_name FROM status WHERE member_id = ? AND status = ?', [data.id, data.type]);

            if(!checkStatus) {
                return await interaction.reply({
                    content: `${data.id} didn't take a ${data.type} *yet*`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.delete(`DELETE FROM status WHERE member_id = ? AND status = ?`, [data.id, data.type]);

            const message = {
                title: `${data.type} removed from ${checkStatus.member_name} (${data.id})`,
                author: `${interaction.user.username}`,
                color: data.color,
                description: `\t`
            };
            
            await managementLog.sendMessage(message, interaction.client);

            return checkStatus;
        }

        async function renameMember(data, interaction) {
            
            // Check if the member is in db
            const checkStatus = await db.getrow('SELECT member_name FROM status WHERE member_id = ? LIMIT 1', [data.id]);

            if(!checkStatus) {
                return await interaction.reply({
                    content: `${data.id} isn't in database`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.delete(`UPDATE status SET member_name = ? WHERE member_id = ?`, [data.name, data.id]);

            const message = {
                title: `Rename`,
                author: `${interaction.user.username}`,
                color: data.color,
                description: `${data.id} has been renamed to ${data.name}`
            };
            
            await managementLog.sendMessage(message, interaction.client);

            return checkStatus;
        }

        async function editReason(data, status, interaction) {
            
            // Check if the member is in db
            const checkStatus = await db.getrow('SELECT member_name, reason FROM status WHERE member_id = ? AND status = ? LIMIT 1', [data.id, status]);
            
            if(!checkStatus) {
                return await interaction.reply({
                    content: `${data.id} didn't receive a ${status}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.delete(`UPDATE status SET reason = ? WHERE member_id = ? AND status = ?`, [data.reason, data.id, status]);

            const message = {
                title: `Edit reason`,
                author: `${interaction.user.username}`,
                color: data.color,
                description: `${checkStatus.member_name} (${data.id}) ${status} reason has been changed: ${data.reason}`
            };
            
            await managementLog.sendMessage(message, interaction.client);

            return checkStatus;
        }

        async function listStatus(data, interaction) {

            let isFirstParameter = true;
            let query = "SELECT member_id, member_name, status, DATE_FORMAT(date, '%Y-%m-%d') AS 'date', reason FROM status ";
            const suffix = "ORDER BY date DESC";
            const parameters = [];

            if(data.id) {
                if(isFirstParameter) {
                    query += "WHERE ";
                    isFirstParameter = false;
                } else {
                    query += "AND ";
                }

                query += "member_id = ? ";
                parameters.push(data.id);
            }

            if(data.type) {
                if(isFirstParameter) {
                    query += "WHERE ";
                    isFirstParameter = false;
                } else {
                    query += "AND ";
                }

                query += "status = ? ";
                parameters.push(data.type);
            }

            return await db.getall(`${query}${suffix}`, parameters);
        }
    }
}