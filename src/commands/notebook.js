import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { db } from '../connections/database.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("notebook")
    .setDescription("Write, store and read notes")
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("new")
        .setDescription("Create a new notebook")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the notebook")
            .setRequired(true)
        )
        .addBooleanOption( (option) =>
            option
            .setName("public")
            .setDescription("yes if everyone can read your notebook")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("open")
        .setDescription("Open one of your notebooks")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the notebook")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("delete")
        .setDescription("Delete one of your notebooks")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the notebook")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit a notebook visibility")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the notebook")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption( (option) =>
            option
            .setName("public")
            .setDescription("yes if everyone can read your notebook")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("read")
        .setDescription("Read someone's notebook")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the notebook")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    , async execute(interaction){

        // Get all command data
        const parameters = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            public: (interaction.options.getBoolean("public")) ? interaction.options.getBoolean("public") : null
        }

        switch(interaction.options.getSubcommand()){
            case "new":
                await newNotebook(parameters, interaction.user.id, interaction);
            break;
            case "open":
                await openNoteBook(parameters.name, interaction.user.id, interaction);
            break;
            case "delete":
                await deleteNotebook(parameters.name, interaction.user.id, interaction);
            break;
            case "edit":
                await editNotebook(parameters, interaction.user.id, interaction);
            break;
            case "read":
                await readNotebook(parameters.name, interaction.user.id, interaction);
            break;
            default:
            break;
        }

        async function newNotebook(data, userId, interaction) {
            // Check if a notebook with this name already exists
            const exists = await db.getrow(`SELECT id FROM notebook WHERE id = ? AND name = ?`, [userId, data.name]);
            if(exists) {
                return await interaction.reply({
                    content: `You already created a notebook with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.insert(`INSERT INTO notebook (id, name, visibility) VALUES (?, ?, ?)`, [userId, data.name, (data.public) ? 0 : 1]);

            return await interaction.reply({
                content: `notebook created. You can now open it with \`/notebook open\``,
                flags: MessageFlags.Ephemeral
            });
        }

        async function deleteNotebook(name, userId, interaction) {
            // Check if there's a notebook
            const exists = await db.getrow(`SELECT id FROM notebook WHERE id = ? AND name = ?`, [userId, name]);
            if(!exists) {
                return await interaction.reply({
                    content: `There isn't any notebook with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.delete(`DELETE FROM notebook WHERE id = ? AND name = ?`, [userId, name]);

            return await interaction.reply({
                content: `The notebook has been deleted`,
                flags: MessageFlags.Ephemeral
            });
        }

        async function editNotebook(data, userId, interaction) {
            // Check if a notebook with this name already exists
            const exists = await db.getrow(`SELECT id FROM notebook WHERE id = ? AND name = ?`, [userId, data.name]);
            if(!exists) {
                return await interaction.reply({
                    content: `There isn't any notebook with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.insert(`UPDATE notebook SET visibility = ? WHERE id = ? AND name = ?`, [(data.public) ? 0 : 1, userId, data.name]);

            return await interaction.reply({
                content: `notebook visibility edited`,
                flags: MessageFlags.Ephemeral
            });
        }

        async function openNoteBook(name, userId, interaction) {

            // Check if the notebooks exists
            const exists = await db.getrow(`SELECT id FROM notebook WHERE id = ? AND name = ?`, [userId, name]);
            if(!exists) {
                return await interaction.reply({
                    content: `There isn't any notebook with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const content = await db.getrow(`SELECT content FROM notebook WHERE id = ? AND name = ?`, [userId, name]);

            const modal = new ModalBuilder()
            .setCustomId(`nbMod|||${name}`)
            .setTitle(`${name}`)

            const input = new TextInputBuilder()
            .setCustomId(`nbModContent`)
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setValue(content.content ? content.content : " ");

            const label = new LabelBuilder()
            .setLabel(`content`)
            .setDescription(`Content of the notebook - CLICK ON SUBMIT WHEN YOU'RE DONE OR THE CONTENT WILL NOT SAVE`)
            .setTextInputComponent(input)

            modal.addLabelComponents(label);

            await interaction.showModal(modal);
        }

        async function readNotebook(name, id, interaction) {
            const data = name.split("|||");
            
            const content = await db.getrow(`SELECT content FROM notebook WHERE id = ? AND name = ?`, [data[1], data[0]]);
            if(!content) {
                return await interaction.reply({
                    content: `There isn't any notebook with this name`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
            .setTitle(`${data[0]}`)
            .setTimestamp()
            .setDescription(`${content.content}`);

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}