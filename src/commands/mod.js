import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

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
        )
        .addStringOption( (option) =>
            option
            .setName("timezone")
            .setDescription("member timezone")
        )
        .addStringOption( (option) =>
            option
            .setName("id")
            .setDescription("member in-game ID")
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

            const existing = await db.getrow(`SELECT * FROM member WHERE id = ?`, [params.member.id]);

            if(!existing) {
                await db.insert(`INSERT INTO member (id) VALUES (?)`, (params.member.id));
            }

            if(params.name) await db.update(`UPDATE member SET name = ? WHERE id = ?`, [params.name, params.member.id]);
            if(params.timezone) await db.update(`UPDATE member SET timezone = ? WHERE id = ?`, [params.timezone, params.member.id]);
            if(params.id) await db.update(`UPDATE member SET ig_id = ? WHERE id = ?`, [params.id, params.member.id]);

            return await interaction.reply({
                content: `member updated successfully, he will be updated soon`,
                flags: MessageFlags.Ephemeral
            });
            
        }

        async function changeVillage(interaction, params) {
            const member = await db.getrow(`SELECT * FROM member WHERE id = ?`, [params.member.id]);
            const guildMember = await interaction.guild.members.cache.get(params.member.id);

            if(!member) {
                await db.insert(`INSERT INTO member (id) VALUES (?)`, [params.member.id]);
            }

            await interaction.reply({
                content: `Added`,
                flags: MessageFlags.Ephemeral
            });

            if(member && member.village_tag) {
                // Remove origin village
                const originVillage = await db.getrow(`SELECT * FROM village WHERE tag = ?`, [member.village_tag]);

                const originVillageRole = await interaction.guild.roles.cache.get(originVillage.role_id);
                await guildMember.roles.remove(originVillageRole);

                // Send message in village flow
                const oldFlowEmbed = new EmbedBuilder()
                .setTitle(`Member left`)
                .setDescription(`<@${params.member.id}> has left the village !\n#- removed by a moderator`)
                .setColor(globals.embed.orange)
                .setTimestamp();

                const oldFlowChannel = await interaction.guild.channels.cache.get(originVillage.flow);
                oldFlowChannel.send({
                    embeds: [oldFlowEmbed]
                });
            } else {
                // Remove lone role
                const lone = await interaction.guild.roles.cache.get(globals.server.role.lone);
                await guildMember.roles.remove(lone);
            }

            // Add village role
            const village = await db.getrow(`SELECT role_id, name, flow FROM village WHERE tag = ?`, [params.village]);
            const villageRole = await interaction.guild.roles.cache.get(village.role_id);
            await guildMember.roles.add(villageRole);

            // Update database
            await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [params.village, params.member.id]);

            // Send message in village flow
            const flowEmbed = new EmbedBuilder()
            .setTitle(`New member`)
            .setDescription(`<@${params.member.id}> has joined the village !\n#- added by a moderator`)
            .setColor(globals.embed.green)
            .setTimestamp();

            const flowChannel = await interaction.guild.channels.cache.get(village.flow);
            flowChannel.send({
                embeds: [flowEmbed]
            });
        }
    }
}
