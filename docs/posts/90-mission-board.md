---
title: 📣 Mission board and events
tags: Events, Members
---
{{channel:missionBoard}} lists the upcoming events (Blood Clash, daily events, Ninja War and PvP events) and shows the calendar of the next 7 days.
- Times are shown in **your** timezone
- 10 minutes before an event, a reminder pings the role of the event
- The calendar shows the in-game days (UTC), today in yellow
- The Blood Clash requests and lobbies are reset when a Blood Clash starts

## For moderators
- {{cmd:event add}} : name, category, start date `YYYY-MM-DD HH:MM:SS` (in-game time), end date for long events, periodicity, role to ping, data
  - periodicity `Y M D H M S`, with `*` when it doesn't matter: `* * 7 * * *` every week, `* * 1 * * *` every day
  - `calendar_only` : the event is only shown in the calendar, without reminder (in-game activities)
- {{cmd:event remove}} : pick the event from the list
- {{cmd:event data}} : data of an event. Blood Clash: `max floor|||lobby size`, like `1600|||5`
- {{cmd:event calendar}} : logo, color and *calendar only* of an event, for every event with the same name

The calendar is generated from the events: the long ones (with an end date) and the *calendar only* ones. No screenshot to send anymore.
