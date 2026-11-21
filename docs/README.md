# Bot documentation

The documentation of the bot is published in a Discord **forum**: one post per feature, tagged by audience.
The source of each post is a markdown file of `posts/`, so the documentation is versioned with the code.

## Publish / update

```
npm run docs -- <forumId>            # creates the missing posts, edits only what changed
npm run docs -- <forumId> --dry-run  # checks the files without publishing
```

It only uses the Discord API (no gateway): it can run while the bot is running.
The ids of the published posts are saved in `published.json` (one entry per forum).

## Write a post

`posts/<number>-<slug>.md`. The number orders the posts, the slug is used to link the post.

```
---
title: 🗓️ Your schedule and availability
tags: Members, Villages        (forum tags, defined in config.json; the first one groups the post in the index)
pinned: true                  (optional, only for the "Start here" post)
---
Content in Discord markdown
```

| In the file | In Discord |
|---|---|
| `{{cmd:village tac create}}` | clickable command (checked against `src/commands`) |
| `{{post:schedule}}` | link to the post `posts/xx-schedule.md` |
| `{{channel:villages}}` | channel of `globals.server.channel` or `config.json` |
| `{{role:kage}}` | role of `globals.server.role` (displayed, never pinged) |
| `{{media:file.png}}` | attaches `media/file.png` to this message (10 MB max) |
| `{{index}}` | list of all the posts, grouped by tag |
| `---` alone on a line | starts a new message in the post (one message = 2000 characters max) |
