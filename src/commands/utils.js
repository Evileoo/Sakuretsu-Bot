import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("utils")
    .setDescription("Bot random utilities")
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("diceroll")
        .setDescription("Roll a dice")
        .addIntegerOption( (option) =>
            option
            .setName("faces")
            .setDescription("Default: 2")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("money-spent")
        .setDescription("Approximately know how much money you spent in game")
        .addIntegerOption( (option) =>
            option
            .setName("points")
            .setDescription("VIP points you got")
            .setRequired(true)
        )
    )
    .addSubcommandGroup( (subcommandgroup) =>
        subcommandgroup
        .setName("tutorials")
        .setDescription("list of tutorials")
        .addSubcommand( (subcommand) =>
            subcommand
            .setName("markdown")
            .setDescription("Markdown Syntax tutorial")
        )
    )
    , async execute(interaction){

        // Get all command data
        const diceroll = (interaction.options.getSubcommand() != "diceroll") ? null : {
            faces: (interaction.options.getInteger("faces")) ? interaction.options.getInteger("faces") : 6
        }

        const money = (interaction.options.getSubcommand() != "money-spent") ? null : {
            points: (interaction.options.getInteger("points")) ? interaction.options.getInteger("points") : null
        }

        switch(interaction.options.getSubcommandGroup()) {
            case "tutorials":
                switch(interaction.options.getSubcommand()) {
                    case "markdown":
                        const markdown = new EmbedBuilder()
                        .setTitle(`Discord markdown tutorial`)
                        .setDescription(`Markdown language helps to format text and is used by discord.\nHere are some of the things you can do with markdown in dicord:\n\nTitles:\nTo make titles, use a # before the text. The more #s they are, the smaller is the title.\nWrite example: \`\`\`# Big title\n## Sub title\n### Small title\`\`\`\nHow it looks:\n# Big title\n## Sub title\n### Small title\n\nLists\nThey are 2 types of lists, ordered and unordered\nWrite example:\n\`\`\`Unordered:\n- item 1\n- item 2\n- item 3\nOrdered:\n1. item 1\n2. item 2\n3. item 3\`\`\`\nHow it looks:\nUnordered:\n- item 1\n- item 2\n- item 3\nOrdered:\n1. item 1\n2. item 2\n3. item 3\n\nText style:\nWrite example:\n\`\`\`*italic text*\n**bold text**\n***bold italic text***\n~~crossed text~~\`\`\`\nHow it looks:\n*italic text*\n**bold text**\n***bold italic text***\n~~crossed text~~`)
                        .setTimestamp();

                        await interaction.reply({
                            embeds: [markdown],
                            flags: MessageFlags.Ephemeral
                        });
                    break;
                    default:
                    break;
                }
            break;
            default:
                switch(interaction.options.getSubcommand()){
                    case "diceroll":
                        const number = Math.floor(Math.random() * diceroll.faces);

                        await interaction.reply({
                            content: `You rolled a ${number} (range: 1 to ${diceroll.faces})`
                        });
                    break;
                    case "money-spent":
                        const spent = (money.points / 6480 * 100).toFixed(2);

                        await interaction.reply({
                            content: `Your amount of VIP points are worth $${spent}`
                        });
                    break;
                    default:
                    break;
                }
            break;
        }

        
    }
}