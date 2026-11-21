---
title: 👑 Manage your village
tags: Kage & BroKage, Villages
---
The `/village` commands can only be used by the {{role:kage}} and the {{role:sub}} of a village.

## The village channels
- **flow** : the history of the village (new members, departures, promotions…)
- **rules** : the rules of the village, written with {{cmd:village rules}}
- **announcements** : only the Kage and the BroKages can write in it
- **general**
- **moderation** : Kage and BroKages only. The applications and the flow panel are there

## Members
- {{cmd:village invite}} : invite a member of the server who has no village. He receives an invitation in {{channel:villages}}
- Applications arrive in **moderation**: click **Accept** or **Deny**
- {{cmd:village kick}} : remove a member from the village
- {{cmd:village member-name}} : fix the in-game name of a member (without the tag)
- {{cmd:village subkage}} : *Kage only*, promote a member to BroKage, or demote a BroKage
- {{cmd:village members}} : list of the members of the village with their rank, in-game ID and timezone, and the ones who left the server
- Ping the whole village : mention the village role in any channel of the village. Only the Kage and the BroKages can do it, and only in the village channels. {{cmd:village ping}} still works too
---
## Your own channels
The Kage and the BroKages can create channels in the village category, like on any Discord server: right click on the category (long press on phone) → **Create Channel**. Only the members of the village can see them.
- You can rename, edit and delete the channels you created
- The channels made by the bot (flow, rules, announcements, general, moderation) can't be edited or deleted
- Don't delete the category: the bot creates it again and puts the channels back in
---
## Registration lists
For the events of your village: the members register with a button, and the ones who come after the last place go in a waiting list.
- {{cmd:village list create}} : use it in a channel of the village. Give the name of the event, the number of places (no limit if empty) and its details
- The members click **Join** or **Leave**. When a registered member leaves, the first one of the waiting list gets his place and is pinged
- **Close (Kage)** stops the registrations, **Reopen (Kage)** opens them again
- {{cmd:village list edit}} : change the name, the number of places (0: no limit) or the details. With more places, the waiting list moves up
- {{cmd:village list remove}} : remove a member from a list
- {{cmd:village list delete}} : delete a list and its message
Members who leave the village are removed from the lists.
---
## Village settings
- {{cmd:village rules}} : opens a box to write the rules. Click **Submit** to save them
- {{cmd:village rename}} : new name and tag of the village. Keep the in-game ones
- {{cmd:village recolor}} : color of the village role, as a hexadecimal code like `#eb4034`. Search *"color picker"* on Google, pick your color and copy the **HEX** value. The Kage and BroKage colors don't change
{{media:recolor-color-picker.webp}}
{{media:recolor-hex-code.png}}
---
## The flow panel
The pinned message of **moderation** chooses where each event of the village is written:
🟩 green: in **flow**, visible by everyone in the village
🟥 red: only in **moderation**
Click a button to switch it.

When a moderator visits your village to help you (he sees all its channels for some time), it's always written in **flow**, at the start and at the end of the visit.
