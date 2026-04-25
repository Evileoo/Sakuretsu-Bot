import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { db } from '../connections/database.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Manage village bans")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.CreateEvents)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add a member to ban")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(true)
        )
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
        .addIntegerOption( (option) =>
            option
            .setName("rank")
            .setDescription("Last known rank of the member to ban")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("Remove a member ban")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit data of a banned member")
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
        .addIntegerOption( (option) =>
            option
            .setName("rank")
            .setDescription("Server rank of the banned member")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("list")
        .setDescription("List of banned members")
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("check")
        .setDescription("check if a member is banned")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(false)
        )
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(false)
        )
    )
    , async execute(interaction){

        // Get all command data
        const add = (interaction.options.getSubcommand() != "add") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            rank: (interaction.options.getInteger("rank")) ? interaction.options.getInteger("rank") : null
        }

        const remove = (interaction.options.getSubcommand() != "remove") ? null : {
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null
        }

        const edit = (interaction.options.getSubcommand() != "edit") ? null : {
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            rank: (interaction.options.getInteger("rank")) ? interaction.options.getInteger("rank") : null
        }

        const check = (interaction.options.getSubcommand() != "check") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null
        }


        switch(interaction.options.getSubcommand()){
            case "add":
                await addBan(add);

                await interaction.reply({
                    content: "member banned",
                    ephemeral: true
                });
            break;
            case "remove":
                await removeBan(remove);

                await interaction.reply({
                    content: "member unbanned",
                    ephemeral: true
                });
            break;
            case "edit":
                await editBan(edit);

                await interaction.reply({
                    content: "member edited",
                    ephemeral: true
                });
            break;
            case "list":
                const banList = await listBans();

                // Create discord embed
                const bannedMembers = new EmbedBuilder()
                .setTitle(`Banned members`)
                .setTimestamp()

                let nameList = "";
                let rankList = "";
                let idList = "";

                for(const ban of banList) {
                    idList += (ban.member_id) ? `${ban.member_id}\n` : `-\n`;
                    nameList += (ban.member_name) ? `${ban.member_name}\n` : `-\n`;
                    rankList += (ban.member_rank) ? `${ban.member_rank}\n` : `-\n`;
                }

                bannedMembers.addFields({name: `ID`, value: `${idList}`, inline: true});
                bannedMembers.addFields({name: `Name`, value: `${nameList}`, inline: true});
                bannedMembers.addFields({name: `Rank`, value: `${rankList}`, inline: true});

                await interaction.reply({
                    embeds: [bannedMembers]
                });

            break;
            case "check":
                const member = await checkBan(check);

                if(member) {
                    await interaction.reply({
                        content: `ID: ${member.member_id} \nName: ${member.member_name} \nRank: ${member.member_rank}\nThis member is banned`,
                        ephemeral: true
                    })
                } else {
                    await interaction.reply({
                        content: `Nobody with these parameters is banned`,
                        ephemeral: true
                    });
                }
            break;
            default:
            break;
        }

        async function addBan(data) {
            console.log(data);
            await db.insert('INSERT INTO bans (member_id, member_name, member_rank) VALUES (?, ?, ?)', [data.id, data.name, data.rank]);
        }

        async function removeBan(data) {
            await db.delete('DELETE FROM bans WHERE member_id = ?', [data.id]);
        }

        async function editBan(data) {
            if(data.name != null) {
                await db.update('UPDATE bans SET member_name = ? WHERE member_id = ?', [data.name, data.id]);
            }
        
            if(data.rank != null) {
                await db.update('UPDATE bans SET member_rank = ? WHERE member_id = ?', [data.rank, data.id]);
            }
        }

        async function listBans() {
            return await db.getall('SELECT member_id, member_name, member_rank FROM bans ORDER BY member_rank');
        }

        async function checkBan(data) {
            return await db.getrow('SELECT member_id, member_name, member_rank FROM bans WHERE member_id = ? OR member_name = ?', [data.id, data.name]);
        }
    }
}