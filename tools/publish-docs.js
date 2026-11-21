// Publishes the documentation (docs/posts/*.md) in a Discord forum: one post per file.
// Creates the missing posts, updates the existing ones (only what changed), keeps the forum tags in sync.
// REST only: it can run while the bot is running.
//
// Usage: npm run docs -- <forumId> [--dry-run]
//
// Placeholders in the markdown files:
//   {{cmd:village tac create}}  clickable command        {{post:schedule}}    link to an other post (file name without the number)
//   {{channel:villages}}        channel (globals/config) {{role:kage}}        role, displayed without pinging anyone
//   {{media:file.png}}          attach docs/media/file.png to this message   {{index}}  list of all the posts, by tag
//   ---                         (alone on a line) starts a new message in the post
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes, ChannelType, MessageFlags } from 'discord.js';
import { globals } from '../src/globals.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const forumId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!forumId || !/^\d+$/.test(forumId)) {
    console.error('Usage: npm run docs -- <forumId> [--dry-run]');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(path.join(docsDir, 'config.json'), 'utf8'));
const publishedFile = path.join(docsDir, 'published.json');
const published = fs.existsSync(publishedFile) ? JSON.parse(fs.readFileSync(publishedFile, 'utf8')) : {};
const threads = published[forumId] ?? {};
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const NO_MENTIONS = { parse: [] };
const MAX_LENGTH = 2000;

// ---------------------------------------------------------------- read the posts
function readPost(file) {
    const raw = fs.readFileSync(path.join(docsDir, 'posts', file), 'utf8').replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: missing front matter`);

    const meta = Object.fromEntries(match[1].split('\n').filter(Boolean).map(line => {
        const i = line.indexOf(':');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }));

    return {
        file,
        slug: file.replace(/^\d+-/, '').replace(/\.md$/, ''),
        order: parseInt(file),
        title: meta.title,
        tags: (meta.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
        pinned: meta.pinned === 'true',
        body: match[2].trim()
    };
}

const posts = fs.readdirSync(path.join(docsDir, 'posts'))
    .filter(f => f.endsWith('.md'))
    .map(readPost)
    .sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------- local commands (source of truth for {{cmd:}})
const localCommands = new Set();
for (const file of fs.readdirSync(path.join(root, 'src', 'commands')).filter(f => f.endsWith('.js'))) {
    const { command } = await import(pathToFileURL(path.join(root, 'src', 'commands', file)).href);
    const json = command.data.toJSON();
    localCommands.add(json.name);
    for (const option of json.options ?? []) {
        if (option.type === 1) localCommands.add(`${json.name} ${option.name}`);
        if (option.type === 2) for (const sub of option.options ?? []) localCommands.add(`${json.name} ${option.name} ${sub.name}`);
    }
}

// ---------------------------------------------------------------- render
const problems = [];

function render(post, deployed, postLinks) {
    const channels = { ...globals.server.channel, ...config.channels };
    const roles = globals.server.role;

    let text = post.body
    .replace(/\{\{cmd:([^}]+)\}\}/g, (_, name) => {
        if (!localCommands.has(name)) problems.push(`${post.file}: unknown command /${name}`);
        const id = deployed.get(name.split(' ')[0]);
        return id ? `</${name}:${id}>` : `\`/${name}\``;
    })
    .replace(/\{\{post:([^}]+)\}\}/g, (_, slug) => {
        if (!posts.some(p => p.slug === slug)) problems.push(`${post.file}: unknown post ${slug}`);
        return postLinks[slug] ? `<#${postLinks[slug]}>` : `**${posts.find(p => p.slug === slug)?.title ?? slug}**`;
    })
    .replace(/\{\{channel:([^}]+)\}\}/g, (_, name) => {
        if (!channels[name]) problems.push(`${post.file}: unknown channel ${name}`);
        return `<#${channels[name]}>`;
    })
    .replace(/\{\{role:([^}]+)\}\}/g, (_, name) => {
        if (!roles[name]) problems.push(`${post.file}: unknown role ${name}`);
        return `<@&${roles[name]}>`;
    })
    .replace(/\{\{index\}\}/g, () => {
        const lines = [];
        for (const tag of config.forum.tags) {
            const tagged = posts.filter(p => !p.pinned && p.tags[0] === tag.name);
            if (tagged.length === 0) continue;
            lines.push(`**${tag.emoji} ${tag.name}**`);
            for (const p of tagged) lines.push(`- ${postLinks[p.slug] ? `<#${postLinks[p.slug]}>` : p.title}`);
        }
        return lines.join('\n');
    });

    // Split into messages: explicit "---" separators, then by lines when a part is too long
    const messages = [];
    for (const part of text.split(/\n---\n/)) {
        const media = [...part.matchAll(/^\{\{media:([^}]+)\}\}$/gm)].map(m => m[1]);
        let content = part.replace(/^\{\{media:[^}]+\}\}\n?/gm, '').trim();

        for (const file of media) if (!fs.existsSync(path.join(docsDir, 'media', file))) problems.push(`${post.file}: missing media ${file}`);

        const chunks = [];
        while (content.length > MAX_LENGTH) {
            const cut = content.lastIndexOf('\n', MAX_LENGTH);
            if (cut <= 0) { problems.push(`${post.file}: a line is longer than ${MAX_LENGTH} characters`); break; }
            chunks.push(content.slice(0, cut));
            content = content.slice(cut + 1);
        }
        chunks.push(content);
        chunks.forEach((chunk, i) => messages.push({ content: chunk, media: i === chunks.length - 1 ? media : [] }));
    }
    return messages.filter(m => m.content || m.media.length);
}

function payload(message) {
    const files = message.media.map(file => ({ name: file, data: fs.readFileSync(path.join(docsDir, 'media', file)) }));
    return {
        body: {
            content: message.content,
            allowed_mentions: NO_MENTIONS,
            flags: MessageFlags.SuppressEmbeds,
            attachments: files.map((f, id) => ({ id, filename: f.name }))
        },
        files
    };
}

// ---------------------------------------------------------------- forum
const forum = await rest.get(Routes.channel(forumId));
if (forum.type !== ChannelType.GuildForum) throw new Error(`${forumId} is not a forum`);

const deployedCommands = await rest.get(Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID));
const deployed = new Map(deployedCommands.map(c => [c.name, c.id]));

// Tags (existing tags are kept) and forum settings
const tags = [...forum.available_tags];
for (const tag of config.forum.tags) {
    if (!tags.some(t => t.name === tag.name)) tags.push({ name: tag.name, emoji_name: tag.emoji });
}
const tagId = (name) => tags.find(t => t.name === name)?.id;

if (!dryRun) {
    const updated = await rest.patch(Routes.channel(forumId), { body: {
        available_tags: tags,
        topic: config.forum.guidelines,
        default_sort_order: 1, // creation date
        default_forum_layout: 1 // list
    } });
    tags.splice(0, tags.length, ...updated.available_tags);
}

// Existing posts: check they still exist
for (const [slug, threadId] of Object.entries(threads)) {
    try { await rest.get(Routes.channel(threadId)); } catch (e) { delete threads[slug]; }
}

// 1. Create the missing posts (last ones first: the forum shows the newest posts first)
for (const post of [...posts].reverse()) {
    if (threads[post.slug]) continue;
    console.log(`create  ${post.file}`);
    if (dryRun) continue;
    const thread = await rest.post(Routes.threads(forumId), { body: {
        name: post.title.slice(0, 100),
        applied_tags: post.tags.map(tagId).filter(Boolean).slice(0, 5),
        message: { content: `*${post.title}*`, allowed_mentions: NO_MENTIONS }
    } });
    threads[post.slug] = thread.id;
}

// 2. Write every post (links to the other posts are known now)
let edited = 0, sent = 0, deleted = 0;
for (const post of posts) {
    const messages = render(post, deployed, threads);
    const threadId = threads[post.slug];
    if (dryRun) { console.log(`render  ${post.file}: ${messages.length} message(s), ${messages.map(m => m.content.length).join('/')} chars`); continue; }

    await rest.patch(Routes.channel(threadId), { body: {
        archived: false,
        name: post.title.slice(0, 100),
        applied_tags: post.tags.map(tagId).filter(Boolean).slice(0, 5),
        flags: post.pinned ? 2 : 0
    } });

    const existing = (await rest.get(Routes.channelMessages(threadId) + '?limit=100'))
        .filter(m => m.author.id === process.env.CLIENTID)
        .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);

    for (let i = 0; i < messages.length; i++) {
        const old = existing[i];
        const same = old && old.content === messages[i].content && old.attachments.map(a => a.filename).join() === messages[i].media.join();
        if (same) continue;
        if (old) { await rest.patch(Routes.channelMessage(threadId, old.id), payload(messages[i])); edited++; }
        else { await rest.post(Routes.channelMessages(threadId), payload(messages[i])); sent++; }
    }
    // The first message of a post can't be deleted: it is emptied instead
    for (const old of existing.slice(messages.length)) {
        if (old.id === threadId) await rest.patch(Routes.channelMessage(threadId, old.id), { body: { content: '​', attachments: [] } });
        else await rest.delete(Routes.channelMessage(threadId, old.id));
        deleted++;
    }
    console.log(`publish ${post.file}`);
}

if (!dryRun) {
    published[forumId] = threads;
    fs.writeFileSync(publishedFile, JSON.stringify(published, null, 4) + '\n');
}

for (const problem of [...new Set(problems)]) console.warn(`⚠️  ${problem}`);
console.log(dryRun ? 'Dry run, nothing published' : `Done: ${posts.length} posts, ${sent} message(s) sent, ${edited} edited, ${deleted} removed`);
