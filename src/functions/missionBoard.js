import { AttachmentBuilder, EmbedBuilder, SectionComponent } from 'discord.js';
import schedule from 'node-schedule';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

async function missionBoard(client) {

    // Update old events
    await updateEvents(client);

    // Create routine
    const missionBoardUpdates = schedule.scheduleJob('0 */1 * * * *', async function() {
        // Get date
        const now = new Date();
        now.setSeconds = 0;
        now.setMilliseconds = 0;

        // Transform into UTC date
        const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));

        // Check if there's an event soon
        const checkEvent = await db.getall(`SELECT DATE_FORMAT(event_time, '%Y %m %d %H %i %s') AS "time", event_id FROM events ORDER BY event_time ASC`);
        const formatted = (checkEvent.length > 0) ? {
            year: checkEvent[0].time.split(" ")[0],
            month: checkEvent[0].time.split(" ")[1],
            day: checkEvent[0].time.split(" ")[2],
            hour: checkEvent[0].time.split(" ")[3],
            minute: checkEvent[0].time.split(" ")[4],
            second: checkEvent[0].time.split(" ")[5],
        } : null;
        const nextEventdate = (checkEvent.length > 0) ? new Date(Date.UTC(formatted.year, formatted.month - 1, formatted.day, formatted.hour, formatted.minute, formatted.second)) : null;
        const timeBeforeStart = nextEventdate.getTime() - utcNow.getTime();

        // Get guild and channel objects
        const guild = await client.guilds.fetch(`${globals.server.id}`);
        const channel = await guild.channels.cache.get(`${globals.server.channel.missionBoard}`);

        if(timeBeforeStart == 10 * 60 * 1000) { // 10 minutes before the event
            // Delete the panel

            await editPanel(channel, "delete");

            for(const ce of checkEvent) {
                if(ce.event_id != checkEvent[0].event_id) break;

                // Send notification message
                await startMessage(channel, ce.event_id);
            }

            // Rewrite the panel

            await editPanel(channel, "create");
        } else if(timeBeforeStart == 10 * 60 * 1000 * -1) { // when event started since 10 minutes

            for(const ce of checkEvent) {
                if(ce.event_id != checkEvent[0].event_id) break;

                // Set the next event starting date
                await nextDate(ce.event_id);
            }

            // Rewrite the panel
            await editPanel(channel, "edit");
        }
        
    });

}

async function updateEvents(client) {
    // Get all events
    const events = await db.getall(`SELECT DATE_FORMAT(event_time, '%Y %m %d %H %i %s') AS "date", event_frequency, event_id FROM events ORDER BY event_time ASC`);

    // Get today's date
    const now = new Date();
    now.setSeconds = 0;
    now.setMilliseconds = 0;

    // Transform into UTC date
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
    // For each event
    for(const event of events) {
        // If it has an event frequency, update it to the next event start
        if(event.event_frequency != null) {
            let done = false;
            do {
                const eventDate = await db.getrow(`SELECT DATE_FORMAT(event_time, '%Y %m %d %H %i %s') AS "time" FROM events WHERE event_id = ?`, [event.event_id]);

                const formatted = {
                    year: eventDate.time.split(" ")[0],
                    month: eventDate.time.split(" ")[1],
                    day: eventDate.time.split(" ")[2],
                    hour: eventDate.time.split(" ")[3],
                    minute: eventDate.time.split(" ")[4],
                    second: eventDate.time.split(" ")[5],
                };
                const nextEventdate = new Date(Date.UTC(formatted.year, formatted.month - 1, formatted.day, formatted.hour, formatted.minute, formatted.second));
                if(nextEventdate < utcNow) {
                    await nextDate(event.event_id);
                } else {
                    done = true;
                }
            } while(done == false);
        } else {
            await nextDate(event.event_id);
        }
    }

    const guild = await client.guilds.fetch(`${globals.server.id}`);
    const channel = await guild.channels.cache.get(`${globals.server.channel.missionBoard}`);

    await editPanel(channel, "edit");
}

async function startMessage(channel, eventId) {
    const event = await db.getrow(`SELECT event_name, role_to_ping FROM events WHERE event_id = ?`, [eventId]);

    if(event.role_to_ping != null) {
        channel.send({
            content: `${event.role_to_ping}: ${event.event_name} starts in 10 minutes`
        });
    } else {
        channel.send({
            content: `${event.event_name} starts in 10 minutes`
        });
    }

    
}

async function nextDate(eventId) {
    const event = await db.getrow(`SELECT DATE_FORMAT(event_time, '%Y %m %d %H %i %s') AS "date", event_frequency FROM events WHERE event_id = ?`, [eventId]);
    if(!event) return;


    // Get the date in UTC format
    const date = new Date(event.date.split(" ")[0], event.date.split(" ")[1] - 1, event.date.split(" ")[2], event.date.split(" ")[3], event.date.split(" ")[4], event.date.split(" ")[5]);

    if(event.event_frequency == null && new Date().getTime() > date) {
        return await db.delete(`DELETE FROM events WHERE event_id = ?`, [eventId]);
    } else if(event.event_frequency == null) return;

    // Parse the frequency for calculus
    const parse = (v) => (v == "*" ? null : Number(v));

    const parsed = {
        year: parse(event.event_frequency.split(" ")[0]),
        month: parse(event.event_frequency.split(" ")[1]),
        date: parse(event.event_frequency.split(" ")[2]),
        hour: parse(event.event_frequency.split(" ")[3]),
        minute: parse(event.event_frequency.split(" ")[4]),
        second: parse(event.event_frequency.split(" ")[5]),
    }

    // Calculate new date
    const newDate = date;

    if(parsed.year != null) newDate.setFullYear(newDate.getFullYear() + parsed.year);
    if(parsed.month != null) newDate.setMonth(newDate.getMonth() + parsed.month);
    if(parsed.date != null) newDate.setDate(newDate.getDate() + parsed.date);
    if(parsed.hour != null) newDate.setHours(newDate.getHours() + parsed.hour);
    if(parsed.minute != null) newDate.setMinutes(newDate.getMinutes() + parsed.minute);
    if(parsed.second != null) newDate.setSeconds(newDate.getSeconds() + parsed.second);

    
    

    await db.update(`UPDATE events SET event_time = ? WHERE event_id = ?`, [newDate, eventId]);

}

async function editPanel(channel, action) {
    if(action == "delete") {

        // Get the last message sent in the missionBoard channel (should be the panel)
        const fetched = await channel.messages.fetch({ limit:1 });

        // Delete it
        await fetched.last().delete();

    } else if(action == "create" || action == "edit") {

        // Get all the events
        const events = await db.getall(`SELECT event_name, DATE_FORMAT(event_time, '%Y %m %d %H %i %s') AS "date" FROM events ORDER BY event_name, event_time`);

        // Get the calendar image
        const attachment = new AttachmentBuilder('./data', {name: 'calendar.png'});

        // Create the mission board embed
        const missionBoard = new EmbedBuilder()
        .setTitle(`Mission Board`)
        .setImage(`attachment://calendar.png`)
        .setTimestamp();

        let lastEvent = "";
        let schedule;

        for(let i = 0; i < events.length; i++) {
            if(events[i].event_name != lastEvent) {
                if(i != 0) {
                    missionBoard.addFields({ name: `${lastEvent}`, value: `${schedule}` });
                }
                schedule = "";
                lastEvent = events[i].event_name;
            }

            const date = new Date(Date.UTC(events[i].date.split(" ")[0], events[i].date.split(" ")[1] - 1, events[i].date.split(" ")[2], events[i].date.split(" ")[3], events[i].date.split(" ")[4], events[i].date.split(" ")[5]));

            schedule += `<t:${date / 1000}:t> : <t:${date / 1000}:R>\n`;
        }

        if(lastEvent != "") missionBoard.addFields({ name: `${lastEvent}`, value: `${schedule}` });

        missionBoard.addFields({ name: `Event calendar`, value: `\t` });

        if(action == "create") {
            await channel.send({
                embeds: [missionBoard],
                files: [{ attachment: `./data/calendar.png`, name: `calendar.png` }]
            });
        } else if(action == "edit") {
            // Get the last message sent in the missionBoard channel (should be the panel)
            const fetched = await channel.messages.fetch({ limit:1 });

            await fetched.last().edit({
                embeds: [missionBoard],
                files: [{ attachment: `./data/calendar.png`, name: `calendar.png` }]
            });
        }

    }
}

export const mb = { missionBoard, editPanel };