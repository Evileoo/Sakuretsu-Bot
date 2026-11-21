import fs from 'fs';
import { globals } from '../globals.js';

// Links to the posts of the documentation forum (docs/posts/*.md, published with "npm run docs")
const publishedFile = new URL('../../docs/published.json', import.meta.url);

// Id of the post of a documentation file (file name without its number, ex: "schedule"), or null
function threadId(slug) {
    //const forumId = globals.server.channel.docs;
    const forumId = "1573673044117954671";

    try {
        // Read at each call: republishing the documentation doesn't need a restart of the bot
        const published = JSON.parse(fs.readFileSync(publishedFile, 'utf8'));
        return published[forumId]?.[slug] ?? null;
    } catch(error) {
        return null;
    }
}

// URL of a post, for link buttons
function url(slug) {
    const id = threadId(slug);
    return id ? `https://discord.com/channels/${globals.server.id}/${id}` : null;
}

// Mention of a post in a message, with a text fallback when the documentation isn't published
function mention(slug, fallback = `the documentation`) {
    const id = threadId(slug);
    return id ? `<#${id}>` : fallback;
}

export const docs = { url, mention };
