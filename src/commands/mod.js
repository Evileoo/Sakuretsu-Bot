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
    , async execute(interaction){

        const command = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            timezone: (interaction.options.getString("timezone")) ? interaction.options.getString("timezone") : null,
            id: (interaction.options.getString("id")) ? interaction.options.getString("id") : null,
            member: (interaction.options.getUser("member")) ? interaction.options.getUser("member") : null,
        }

        switch(interaction.options.getSubcommandGroup()){
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
            let count = 0;
            const existing = await db.getrow(`SELECT * FROM member WHERE id = ?`, [params.member.id]);

            if(params.name) {
                count++;
                if(existing || count > 0) {
                    await db.update(`UPDATE member SET name = ? WHERE id = ?`, [params.name, params.member.id]);
                } else {
                    await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [params.member.id, params.name]);
                }
            }

            if(params.timezone) {
                count++;
                if(existing || count > 0) {
                    await db.update(`UPDATE member SET timezone = ? WHERE id = ?`, [params.timezone, params.member.id]);
                } else {
                    await db.insert(`INSERT INTO member (id, timezone) VALUES (?, ?)`, [params.member.id, params.timezone]);
                }
            }

            if(params.id) {
                count++;
                if(existing || count > 0) {
                    await db.update(`UPDATE member SET ig_id = ? WHERE id = ?`, [params.id, params.member.id]);
                } else {
                    await db.insert(`INSERT INTO member (id, ig_id) VALUES (?, ?)`, [params.member.id, params.id]);
                }
            }

            if(count > 0) {
                return await interaction.reply({
                    content: `member updated successfully, he will be updated soon`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                return await interaction.reply({
                    content: `please give data to edit`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}
