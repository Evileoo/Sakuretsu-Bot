import { WebhookClient } from 'discord.js';
import { db } from '../connections/database.js';
import translate from 'google-translate-api-x';
import { client } from '../client.js';
import { manageEmojis } from './emojis.js';

let links;

async function get() {
    return links;
}

async function load() {
    links = [];

    const tchannels = await db.getall(`SELECT channel_id, link_id, webhook_id, webhook_tk FROM tchannel ORDER BY link_id`);

    for(const row of tchannels) {
        links.push({ 
            channel: row.channel_id, 
            link: row.link_id, 
            wid: row.webhook_id, 
            wtk: row.webhook_tk 
        });
    }
}

async function messageTranslate(message) {

    
    if(message.webhookId) return;

    // Get channel link
    const sourceLink = links.find(l => l.channel == message.channel.id);
    if (!sourceLink) return;

    // Get all channels with the link
    const channels = links.filter(
        l => l.link == sourceLink.link &&
        l.channel != message.channel.id
    );

    const originLanguage = message.channel.topic?.split("-- ")[1];
    if (!originLanguage) return;

    const protectedMessage = await protectContent(message);

    // Files to forward
    const files = [...message.attachments.values()].map(a => a.url);

    // Keep only embeds that are not media previews
    const embeds = [];

    for (const embed of message.embeds) {

    const provider = embed.provider?.name?.toLowerCase();

    let media = null;

    // Tenor / Giphy
    if (provider === "tenor" || provider === "giphy") {
    //    media = embed.video?.url ?? embed.image?.url ?? embed.thumbnail?.url;
    }

    // Discord CDN
    else if (
        embed.video?.url?.includes("discordapp.net") ||
        embed.video?.url?.includes("discordapp.com") ||
        embed.image?.url?.includes("discordapp.net") ||
        embed.image?.url?.includes("discordapp.com")
    ) {
        media = embed.video?.url ?? embed.image?.url;
    }

    if (media) {
        files.push(media);
        continue;
    } else {

    embeds.push(embed);
    }

    // On conserve les autres embeds (YouTube, Twitter...)
    
    }

    for(const channel of channels) {
        const fetched = message.guild.channels.cache.get(channel.channel);
        const language = fetched.topic?.split("-- ")[1];

        const translated = await translate(
            protectedMessage.content,
            {
                from: originLanguage,
                to: language
            }
        );

        const content = restoreContent(translated.text, protectedMessage.placeholders);

        const webhook = new WebhookClient({
            id: channel.wid,
            token: channel.wtk
        });

        try {
            await webhook.send({
                content,
                username:
                    message.member?.displayName ??
                    message.author.globalName ??
                    message.author.username,
                avatarURL: message.author.displayAvatarURL(),
                embeds: embeds,
                files,
                allowedMentions: {
                    parse: []
                }
            });
        } catch (err) {
            console.error(
                `Failed to send translation to ${channel.channel}`,
                err
            );
        }
    }
}

async function protectContent(message) {
    let content = message.content;
    const placeholders = [];
    let index = 0;

    const replace = (value) => {
        const placeholder = `PAR${index++}`;
        placeholders.push({placeholder, value});
        return placeholder;
    }

    const emojis = await manageEmojis.extract(message);

    for(const emoji of emojis) {
        const applicationEmoji = await manageEmojis.manage(client, emoji);

        const original = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
        const replacement = `<${applicationEmoji.animated ? "a" : ""}:${applicationEmoji.name}:${applicationEmoji.id}>`;

        content = content.replaceAll(original, replace(replacement));
    }

    // Mentions utilisateurs
    content = content.replace(/<@!?\d+>/g, match => replace(match));

    // Mentions rôles
    content = content.replace(/<@&\d+>/g, match => replace(match));

    // Mentions salons
    content = content.replace(/<#\d+>/g, match => replace(match));

    // Liens
    content = content.replace(/https?:\/\/[^\s]+/gi, match => replace(match));

    // Balises spoiler
    content = content.replace(/\|\|.*?\|\|/g, match => replace(match));

    // Blocs de code
    content = content.replace(/```[\s\S]*?```/g, match => replace(match));

    // Code inline
    content = content.replace(/`[^`]+`/g, match => replace(match));

    return { content, placeholders };
}

function restoreContent(content, placeholders) {
    for (const { placeholder, value } of placeholders) {
        content = content.replaceAll(placeholder, value);
    }

    return content;
}

export const translation = {load, get, messageTranslate};