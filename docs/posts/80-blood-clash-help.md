---
title: 🤝 Blood Clash: help other players
tags: Blood Clash
---
Helper commands are written as normal messages (no `/`) in the helpers channel, or in your lobby. They are deleted after a few seconds.

## Set up once
- `max floor 1500` : the highest floor you can reach alone
- `id 123456` : your in-game ID

## Help someone
- `help 4` : help the request **n°4** of the list. It creates your lobby, or adds the member to it
- `finish 4 1550` or `finish @member 1550` : the push is done, give the floor where you stopped. The member goes back to the list from the next floor
- `cancel 4` or `cancel @member` : the member goes back to the list at the same floor
---
## Your lobby
- `lobby open` : public lobby, a **Join lobby** button is posted in {{channel:bloodClash}}
- `lobby close` : private again (or click **Close lobby**)
- `lobby floor 1550` : max floor of this lobby only, when a teammate can go higher than you
- `lobby finish 1500` : closes the lobby and updates the floor of everyone in it
- `lobby cancel` : closes the lobby without changing the floors

## Blacklist
- `blacklist 4` or `blacklist @member` : you won't be able to help him anymore
- `whitelist 4` or `whitelist @member` : undo it
