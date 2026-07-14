import crypto from "crypto";

// This array is a copy of the discord bot emojis
const emojis = [];

// Get emoji URL
function getEmojiURL(emoji) {
    return emoji.animated
        ? `https://cdn.discordapp.com/emojis/${emoji.id}.gif?quality=lossless`
        : `https://cdn.discordapp.com/emojis/${emoji.id}.png?quality=lossless`;
}

// Hash buffer
async function getHashFromURL(url) {
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());

    return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Put the discord bot emojis into the emojis array
async function getBotEmojis(client) {
    const fetched = await client.application.emojis.fetch();

    emojis.length = 0;

    for (const [, emoji] of fetched) {
        emojis.push({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            url: getEmojiURL(emoji),
            hash: await getHashFromURL(getEmojiURL(emoji))
        });
    }

    // Trie du plus ancien au plus récent
    emojis.sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
}

// extract external emojis from a message
async function extract(message) {
    const regex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;

    const found = [];
    let match;

    while ((match = regex.exec(message.content || "")) !== null) {
        const animated = Boolean(match[1]);
        const name = match[2];
        const id = match[3];

        found.push({
            id,
            name,
            animated,
            url: animated
                ? `https://cdn.discordapp.com/emojis/${id}.gif`
                : `https://cdn.discordapp.com/emojis/${id}.png`
        });
    }

    return found;
}

// check, add and delete emoji if necessary
async function manage(client, emoji) {
    const exists = await check(emoji);

    if (exists) {
        return exists;
    }

    // Nombre maximum d'emojis d'application
    const MAX_EMOJIS = 200;

    if (emojis.length >= MAX_EMOJIS) {
        // Le tableau est trié du plus ancien au plus récent
        await removeEmoji(client, emojis[0]);
    }

    return await addEmoji(client, emoji);
}

// Check if the emoji is already uploaded by comparing it's base64 value
async function check(emoji) {
    const hash = await getHashFromURL(emoji.url);

    return emojis.find(e => e.hash === hash) || null;
}

// Add the emoji to the bot emojis and the array
async function addEmoji(client, emoji) {
    const uploaded = await client.application.emojis.create({
        name: emoji.name.slice(0, 32),
        attachment: emoji.url
    });

    const full = {
        id: uploaded.id,
        name: uploaded.name,
        animated: uploaded.animated,
        url: getEmojiURL(uploaded),
        hash: await getHashFromURL(getEmojiURL(uploaded))
    };

    emojis.push(full);

    return full;
}

// Delete the emoji from the bot and array
async function removeEmoji(client, emoji) {
    const index = emojis.findIndex(e => e.id === emoji.id);

    if (index === -1) return false;

    try {
        const appEmoji = await client.application.emojis.fetch(emoji.id);
        await appEmoji.delete();
    } catch (e) {
        // ignore if already deleted
    }

    emojis.splice(index, 1);

    return true;
}


export const manageEmojis = { manage, extract, removeEmoji, getBotEmojis };