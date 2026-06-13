import { WebhookClient } from 'discord.js';
import { db } from '../connections/database.js';
import translate from 'google-translate-api-x';

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

    for(const channel of channels) {
        const fetched = message.guild.channels.cache.get(channel.channel);
        const language = fetched.topic?.split("-- ")[1];

        const translated = await translate(
            message.content,
            {
                from: originLanguage,
                to: language
            }
        );

        const webhook = new WebhookClient({
            id: channel.wid,
            token: channel.wtk
        });

        try {
            await webhook.send({
                content: translated.text,
                username:
                    message.member?.displayName ??
                    message.author.globalName ??
                    message.author.username,
                avatarURL: message.author.displayAvatarURL(),
                embeds: message.embeds,
                files: [
                    ...message.attachments.values()
                ].map(a => a.url)
            });
        } catch (err) {
            console.error(
                `Failed to send translation to ${channel.channel}`,
                err
            );
        }
    }
}

export const translation = {load, get, messageTranslate};