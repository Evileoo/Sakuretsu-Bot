---
title: 🛡️ Moderator commands
tags: Moderators
---
## Members
- {{cmd:mod edit}} : name, timezone or in-game ID of a member
- {{cmd:mod village change}} : move a member to a village. He loses his Kage or BroKage role in his old village
- {{cmd:mod village subkage}} : promote or demote a BroKage of any village

## Villages
- {{cmd:village create}} : creates the role, the channels and the flow panel of a village. The Kage is optional
- {{cmd:village delete}} : deletes the channels and the role of a village. Its members get the {{role:lone}} role
- {{cmd:village tac delete}} : delete any Tri-Army Clash channel
- {{cmd:village members}} : with the **village** option, list of the members of any village
- {{cmd:mod village visit}} : see and write in all the channels of a village (moderation included) to help it, for 24 hours or the number of hours you choose (168 max). You don't join the village: no role, no tag in your name. Use it again to extend the visit
- {{cmd:mod village leave}} : end your visit before its end. Your visits and their end are written in the **flow** of the village

## Events
See {{post:mission-board}}.

## Blood Clash spam
A message that looks like a help request outside {{channel:bloodClash}} is deleted by the bot. When it's not sure, it asks in {{channel:automod}}: **Yes** deletes the message and counts it as spam, **No** ignores it.
