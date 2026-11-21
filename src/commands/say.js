import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { botSay } from '../functions/botSay.js';

// Developer only, not documented
export const command = {
    data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message with the bot account")
    // Only administrators see the command, and only the developer can use it (checked below)
    .setDefaultMemberPermissions(0)
    .addStringOption( (option) =>
        option
        .setName("reply_to")
        .setDescription("Link of the message to reply to")
        .setRequired(false)
    )
    , async execute(interaction){

        if(!botSay.isAllowed(interaction)) return await botSay.refuse(interaction);

        const replyTo = interaction.options.getString("reply_to");
        let target = null;

        if(replyTo) {
            target = await botSay.findMessage(interaction, replyTo);
            if(!target) {
                return await interaction.reply({
                    content: `Message not found. Give its link (right click > Copy Message Link) or its id if it's in this channel`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        await botSay.openModal(interaction, target);
    }
}
