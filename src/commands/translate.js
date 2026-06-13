import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, WebhookClient } from 'discord.js';
import { db } from '../connections/database.js';
import { translation } from '../functions/translation.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translation functionnalities")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("category")
        .setDescription("Create a link category between channels")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("name of the link category")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("link")
        .setDescription("Add a channel to a category")
        .addStringOption( (option) =>
            option
            .setName("category")
            .setDescription("name of the link category")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addChannelOption( (option) =>
            option
            .setName("channel")
            .setDescription("channel to add")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("unlink")
        .setDescription("remove a channel from a category")
        .addChannelOption( (option) =>
            option
            .setName("channel")
            .setDescription("channel to add")
            .setRequired(true)
        )
    )
    , async execute(interaction){

        // Get all command data
        const data = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            category: (interaction.options.getString("category")) ? interaction.options.getString("category") : null,
            channel: (interaction.options.getChannel("channel")) ? interaction.options.getChannel("channel") : null
        }

        switch(interaction.options.getSubcommand()) {
            case "category":
                createCategory(data);
            break;
            case "link":
                addLink(data);
            break;
            case "unlink":
                removeLink(data);
            break;
            default:
            break;
        }

        async function createCategory(data) {
            const exists = await db.getrow(`SELECT id FROM tlink WHERE name = ?`, [data.name]);

            if(exists) {
                return await interaction.reply({
                    content: `A category already exists with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }
            
            await db.insert(`INSERT INTO tlink (name) VALUES (?)`, [data.name]);

            await interaction.reply({
                content: `Category created`,
                flags: MessageFlags.Ephemeral
            });
        }

        async function addLink(data) {
            const linked = await db.getrow(`SELECT link_id FROM tchannel WHERE channel_id = ?`, [data.channel.id]);

            if(linked) {
                return await interaction.reply({
                    content: `This channel is already in a category`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const webhook = await data.channel.createWebhook({
                name: `translation`
            });

            await db.insert(
                `INSERT INTO tchannel (link_id, channel_id, webhook_id, webhook_tk) VALUES (?, ?, ?, ?)`, 
                [data.category, data.channel.id, webhook.id, webhook.token]
            );

            await interaction.reply({
                content: `linked`,
                flags: MessageFlags.Ephemeral
            });

            translation.load();
        }

        async function removeLink(data) {
            const linked = await db.getrow(`SELECT link_id FROM tchannel WHERE channel_id = ?`, [channel.id]);

            if(!linked) {
                return await interaction.reply({
                    content: `This channel isn't linked`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.delete(`DELETE FROM tchannel WHERE channel_id = ?`, [channel.id]);

            await interaction.reply({
                content: `unlinked`,
                flags: MessageFlags.Ephemeral
            });

            translation.load();
        }
    }
}