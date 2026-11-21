import { db } from '../connections/database.js';
import schedule from 'node-schedule';
import { globals } from '../globals.js';

const days = [`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`];

// Members whose name can't be edited by the bot (owner, higher roles...), reported only once
const notEditable = new Set();
let running = false;

// Update the names of every registered member: at startup, then every 5 minutes
async function updateRoutine(client) {
    await updateAll(client);

    schedule.scheduleJob('0 */5 * * * *', async function() {
        await updateAll(client);
    });
}

async function updateAll(client, now = new Date()) {
    // A run can be longer than 5 minutes because of discord rate limits, don't start an other one in the meantime
    if(running) return;
    running = true;

    try {
        const guild = await client.guilds.fetch(`${globals.server.id}`);
        await guild.members.fetch();

        const members = await db.getvals(`SELECT id FROM member WHERE name IS NOT NULL`);
        for(const id of members) {
            if(guild.members.cache.has(id)) await updateName(id, guild, now);
        }
    } catch(error) {
        console.error(`[Names] Routine failed: ${error.message}`);
    } finally {
        running = false;
    }
}

// Timezone format: sign + 1 or 2 digits, between -12 and +12 (ex: +2, -11, +0, +02)
function isValidTimezone(value) {
    if(typeof value !== `string` || !/^[+-]\d{1,2}$/.test(value)) return false;
    const offset = parseInt(value);
    return offset >= -12 && offset <= 12;
}

// Name of a member : "[TAG] Name ✅" / "❌" when he gave his schedule, "(UTC+x)" when he only gave his timezone
async function getNickname(id, now = new Date()) {
    const memberData = await db.getrow(`SELECT name, timezone, village_tag FROM member WHERE id = ?`, [id]);
    if(memberData == null || !memberData.name) return null;

    let availibility = "";

    if(memberData.timezone != null && memberData.timezone !== "") {
        const offset = parseFloat(memberData.timezone) || 0;

        // Schedules are saved in member local time: localNow UTC fields are the member local time
        const localNow = new Date(now.getTime() + offset * 60 * 60 * 1000);
        const today = days[localNow.getUTCDay()];
        const yesterday = days[(localNow.getUTCDay() + 6) % 7];

        const periods = await db.getall(`SELECT day, period FROM schedule WHERE id = ?`, [id]);

        if(periods.length > 0) {
            availibility = isAvailable(periods.filter(p => p.day == today), periods.filter(p => p.day == yesterday), localNow) ? `✅` : `❌`;
        } else {
            availibility = offset >= 0 ? `(UTC+${offset})` : `(UTC${offset})`;
        }
    }

    const tag = memberData.village_tag ? `${memberData.village_tag} ` : "";

    // Discord nicknames are limited to 32 characters
    const suffix = availibility ? ` ${availibility}` : "";
    return `${tag}${memberData.name}`.slice(0, 32 - suffix.length) + suffix;
}

async function updateName(id, guild, now = new Date()) {
    try {
        const member = guild.members.cache.get(id) ?? await guild.members.fetch(id).catch(() => null);
        if(!member) return;

        const nickname = await getNickname(id, now);
        if(!nickname) return;

        if(member.nickname !== nickname) await member.setNickname(nickname);
        notEditable.delete(id);
    } catch(error) {
        // Missing permissions (owner, higher roles...) must not break the calling command
        if(!notEditable.has(id)) console.error(`[Names] Couldn't update the name of ${id}: ${error.message}`);
        notEditable.add(id);
    }
}

// Convert "HH:MM HH:MM" into [start, end] minutes of the day
function toMinutes(period) {
    return period.split(" ").map(time => {
        const [hour, minute] = time.split(":").map(v => parseInt(v));
        return hour * 60 + minute;
    });
}

// today / yesterday: periods of the member for these days, localNow: Date whose UTC fields are the member local time
function isAvailable(today, yesterday, localNow) {
    const nowMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
    const valid = (p) => p.period && p.period.split(" ").length == 2;

    for(const p of today.filter(valid)) {
        const [start, end] = toMinutes(p.period);

        if(start <= end) {
            if(start <= nowMinutes && nowMinutes < end) return true;
        } else if(nowMinutes >= start) {
            // Period going over midnight (ex: 22:00 02:00), evening part
            return true;
        }
    }

    for(const p of yesterday.filter(valid)) {
        const [start, end] = toMinutes(p.period);

        // Period of yesterday going over midnight, morning part
        if(start > end && nowMinutes < end) return true;
    }

    return false;
}

export const nameUpdates = { updateName, updateRoutine, updateAll, getNickname, isValidTimezone };
