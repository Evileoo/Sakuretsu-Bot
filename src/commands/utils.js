import { SlashCommandBuilder, MessageFlags } from 'discord.js';

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
            .setDescription("Default: 6")
            .setRequired(false)
            .setMinValue(2)
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
            .setMinValue(0)
        )
    )
    , async execute(interaction){

        switch(interaction.options.getSubcommand()){
            case "diceroll":
                const faces = interaction.options.getInteger("faces") ?? 6;
                const number = Math.floor(Math.random() * faces) + 1;

                await interaction.reply({
                    content: `You rolled a ${number} (range: 1 to ${faces})`
                });
            break;
            case "money-spent":
                const points = interaction.options.getInteger("points") ?? 0;
                const spent = (points / 6480 * 100).toFixed(2);

                await interaction.reply({
                    content: `Your amount of VIP points are worth $${spent}`,
                    flags: MessageFlags.Ephemeral
                });
            break;
            default:
            break;
        }
    }
}
