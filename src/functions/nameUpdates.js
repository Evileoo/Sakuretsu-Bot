import {  } from 'discord.js';
import { db } from '../connections/database.js';
import schedule from 'node-schedule';
import { globals } from '../globals.js';

async function updateRoutine(client) {

    const checkAvailibility = schedule.scheduleJob('0 */5 * * * *', async function() {
        const guild = await client.guilds.fetch(`${globals.server.id}`);
        const members = await guild.members.fetch();
        
        for(const member of members) {
            updateName(member[1].id, guild);
        }
    });
}


async function updateName(id, guild) {
    const member = await guild.members.cache.get(id);
    
    const now = new Date;
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
    const day = new Intl.DateTimeFormat("en-US", {weekday: "short"}).format(utcNow);

    // Get member data
    const memberData = await db.getrow(`SELECT name, timezone, village_tag FROM member WHERE id = ?`, [id]);

    if(memberData == null) return;

    const editedName = {
        tag: "",
        name: "",
        availibility: ""
    }

    if(memberData.name) {
        editedName.name = memberData.name;
    } else {
        return;
    }

    if(memberData.timezone) {
        // Get member current availibility
        const periods = await db.getall(`SELECT period FROM schedule WHERE id = ? AND day = ?`, [id, day]);

        if(periods.length > 0) {
            if(await isAvailable(periods, memberData)) {
                editedName.availibility = `✅`;
            } else {
                editedName.availibility = `❌`;
            }
        } else {
            if(parseFloat(memberData.timezone) > 0) {
                editedName.availibility = `(UTC+${parseFloat(memberData.timezone)})`;
            } else {
                editedName.availibility = `(UTC${parseFloat(memberData.timezone)})`;
            }
        }
    }

    if(memberData.village_tag) {
        editedName.tag = memberData.village_tag
    }

    member.setNickname(`${editedName.tag != "" ? `${editedName.tag} ` : ""}${editedName.name} ${editedName.availibility}`);


    
}

async function isAvailable(periods, memberData) {

    const now = new Date;
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));

    const offset = parseFloat(memberData.timezone);

    for(const p of periods) {
        const start = p.period.split(" ")[0];
        const end = p.period.split(" ")[1];

        const startHour = parseInt(start.split(":")[0]) - offset;
        const startMinute = parseInt(start.split(":")[1]);
        const endHour = parseInt(end.split(":")[0]) - offset;
        const endMinute = parseInt(end.split(":")[1]);

        const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), startHour, startMinute, now.getUTCSeconds()));
        const utcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), endHour, endMinute, now.getUTCSeconds()));

        if(utcStart <= utcNow && utcNow < utcEnd) return true;
    }

    return false;
}

export const nameUpdates = {updateName, updateRoutine};