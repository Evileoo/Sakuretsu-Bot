import { LabelBuilder, MessageFlags, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { globals } from '../globals.js';

// Send messages with the bot account (/say and the "Reply as bot" app). Developer only, not documented.

function isAllowed(interaction) {
    return interaction.user.id === globals.developer.discord.id;
}

async function refuse(interaction) {
    return await interaction.reply({
        content: `You can't use this command`,
        flags: MessageFlags.Ephemeral
    });
}

// Find a message from its link (https://discord.com/channels/guild/channel/message) or its id (in the current channel)
async function findMessage(interaction, value) {
    const link = value.match(/channels\/\d+\/(\d+)\/(\d+)/);
    const channelId = link ? link[1] : interaction.channelId;
    const messageId = link ? link[2] : value.trim();
    if(!/^\d+$/.test(messageId)) return null;

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if(!channel || !channel.isTextBased()) return null;

    return await channel.messages.fetch(messageId).catch(() => null);
}

// Box to write the message. target: the message to reply to, or null to send it in the channel
async function openModal(interaction, target) {
    const modal = new ModalBuilder()
    .setCustomId(`botSay${globals.separator}${target ? target.channelId : interaction.channelId}${globals.separator}${target ? target.id : `none`}`)
    .setTitle(target ? `Reply as the bot` : `Send as the bot`);

    const content = new TextInputBuilder()
    .setCustomId(`content`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(2000)
    .setRequired(true);

    modal.addLabelComponents(new LabelBuilder()
        .setLabel(`Message`)
        .setTextInputComponent(content));

    if(target) {
        const ping = new StringSelectMenuBuilder()
        .setCustomId(`ping`)
        .addOptions(
            { label: `No`, value: `no`, default: true },
            { label: `Yes`, value: `yes` }
        );

        modal.addLabelComponents(new LabelBuilder()
            .setLabel(`Mention ${(target.member?.displayName ?? target.author.username).slice(0, 30)}`)
            .setStringSelectMenuComponent(ping));
    }

    await interaction.showModal(modal);
}

// Modal submitted: send the message
async function send(interaction, channelId, messageId) {
    const content = interaction.fields.getTextInputValue(`content`);
    const ping = messageId !== `none` && interaction.fields.getStringSelectValues(`ping`)[0] === `yes`;

    // Members can be mentioned, never roles nor everyone
    const allowedMentions = { parse: [`users`], repliedUser: ping };

    try {
        const channel = await interaction.guild.channels.fetch(channelId);
        let sent;

        if(messageId === `none`) {
            sent = await channel.send({ content, allowedMentions });
        } else {
            const target = await channel.messages.fetch(messageId);
            sent = await target.reply({ content, allowedMentions });
        }

        await interaction.reply({
            content: `Sent : ${sent.url}`,
            flags: MessageFlags.Ephemeral
        });
    } catch(error) {
        await interaction.reply({
            content: `Couldn't send the message : ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

export const botSay = { isAllowed, refuse, findMessage, openModal, send };
