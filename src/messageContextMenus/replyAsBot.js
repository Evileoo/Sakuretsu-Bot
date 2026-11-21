import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import { botSay } from '../functions/botSay.js';

// Right click on a message > Apps > Reply as bot. Developer only, not documented
export const messageContextMenu = {
    data: new ContextMenuCommandBuilder()
    .setName("Reply as bot")
    .setType(ApplicationCommandType.Message)
    // Only administrators see it, and only the developer can use it (checked below)
    .setDefaultMemberPermissions(0)
    , async execute(interaction){

        if(!botSay.isAllowed(interaction)) return await botSay.refuse(interaction);

        await botSay.openModal(interaction, interaction.targetMessage);
    }
}
