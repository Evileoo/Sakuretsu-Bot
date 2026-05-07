import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { managementLog } from '../functions/managementLog.js';

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
        .setName("rulebook")
        .setDescription("Show our ingame rulebook")
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
                    case "rulebook":

                        const rules = new EmbedBuilder()
                        .setTitle(`Ingame rules`)
                        .addFields(
                            { name: `Auctions`, value: `1. Call your item before the auction starts (15 minutes minimum)\n2. Call 1 item per auction maximum\n3. If you got the item recently and someone asks for it, leave it to him\n4. Don't bid as anonymous\n5. Don't overbid on others calls\n6. These rules doesn't apply (except rule 4) on items nobody called` },
                            { name: `Help`, value: `1. People help if they want, don't expect them to help you everytime\n2. Don't spam people for help, ask one time and let it go\n3. Don't help players outside the village\n4. If you break the level cap in bloodclash, ask to Evileoo to help until you stuck, then ask to Eddie` },
                            { name: `Conduct`, value: `1. No insults or inappropriate conduct towards any player` },
                            { name: `Sanctions`, value: `1st infraction: warn and reminder of the rules\n2nd infraction: permanent ban from the village` }
                        )
                        .setTimestamp()
                    
                    
                        await interaction.reply({
                            embeds: [rules],
                            flags: MessageFlags.Ephemeral
                        });
                    break;
                    default:
                    break;
                }
            break;
        }

        
    }
}