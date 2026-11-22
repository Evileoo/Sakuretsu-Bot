import { AttachmentBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import schedule from 'node-schedule';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { bc } from './bloodclash.js';
import { calendar } from './calendar.js';

// Dates are saved in the database as UTC ("YYYY MM DD HH MM SS" once formatted)
function parseSqlDate(sqlTimeString) {
    if (!sqlTimeString) return null;
    const [year, month, day, hour, minute, second] = sqlTimeString.split(" ").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// Format a date into a UTC MySQL datetime string
function toSqlDate(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

async function getMissionBoardChannel(client) {
    const guild = await client.guilds.fetch(`${globals.server.id}`);
    return await guild.channels.fetch(globals.server.channel.missionBoard);
}

async function missionBoard(client) {
    // Mise à jour des événements au démarrage du bot (au cas où il était éteint pendant un événement)
    await updateEvents(client).catch(error => console.error(`[Mission board]`, error));
    await refreshPanel(client);

    // Routine de vérification toutes les minutes
    schedule.scheduleJob('0 */1 * * * *', async function() {
        await updateEvents(client).catch(error => console.error(`[Mission board]`, error));
    });

    // The calendar shows the next 7 days: refresh it every day at 00:00 (in-game time, UTC)
    const midnight = new schedule.RecurrenceRule();
    midnight.hour = 0;
    midnight.minute = 0;
    midnight.second = 5;
    midnight.tz = `Etc/UTC`;
    schedule.scheduleJob(midnight, async function() {
        await refreshPanel(client);
    });
}

async function refreshPanel(client) {
    try {
        await editPanel(await getMissionBoardChannel(client), "edit");
    } catch(error) {
        console.error(`[Mission board] Couldn't refresh the panel :`, error);
    }
}


async function updateEvents(client) {
    const utcNow = new Date();
    utcNow.setUTCSeconds(0, 0);

    const events = await db.getall(`SELECT *, DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "time_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "time_end" FROM events ORDER BY event_parent_name, event_time_start ASC`);
    if(events.length == 0) return;

    // Récupération du salon Discord
    const channel = await getMissionBoardChannel(client);

    for(const event of events) {
        // One broken event must not block the others
        try {
            // Get event start date
            const nextStartDate = parseSqlDate(event.time_start);
            const timeBeforeStart = nextStartDate.getTime() - utcNow.getTime();

            if(event.calendar_only == 1) { // only shown in the calendar: no reminder, no message
                const end = event.time_end
                    ? parseSqlDate(event.time_end)
                    : new Date(Date.UTC(nextStartDate.getUTCFullYear(), nextStartDate.getUTCMonth(), nextStartDate.getUTCDate() + 1)); // end of its day

                if(end.getTime() <= utcNow.getTime()) {
                    await nextDate(event.event_id);
                    await editPanel(channel, "edit");
                }
            } else if(!event.time_end) { // ponctual events
                if(timeBeforeStart == 10 * 60 * 1000) { // 10 minutes before start
                    // Delete the mission board panel
                    await editPanel(channel, "delete");

                    // Send the start message
                    await startMessage(client, event, channel);

                    // Recreate the mission board panel
                    await editPanel(channel, "create");
                } else if(timeBeforeStart <= 10 * 60 * 1000 * -1) { // 10 minutes after start
                    // Get the next date
                    await nextDate(event.event_id);

                    // Refresh the panel
                    await editPanel(channel, "edit");
                }
            } else { // long events
                // Get event end date
                const nextEndDate = parseSqlDate(event.time_end);
                const timeBeforeEnd = nextEndDate.getTime() - utcNow.getTime();

                if(timeBeforeEnd <= 0) {
                    // Calculate following dates
                    await nextDate(event.event_id);

                    // Refresh the panel
                    await editPanel(channel, "edit");

                } else if(timeBeforeStart == 0 && event.event_parent_name == "Blood Clash") {
                    // Execute specific event
                    await startMessage(client, event, channel);
                }
            }
        } catch(error) {
            console.error(`[Mission board] Event ${event.event_id} (${event.event_name}) :`, error);
        }
    }
}

async function startMessage(client, event, missionBoardChannel) {
    if (event.event_parent_name === "Blood Clash") {

        const guild = await client.guilds.fetch(globals.server.id)

        const channel = await guild.channels.fetch(globals.server.channel.bloodClash);

        // Suppression des salons d'aide
        const lobbies = await db.getall(`SELECT id, message FROM lobby`);

        for(const lobby of lobbies) {
            if(lobby.message) {
                await channel.messages.delete(lobby.message).catch(() => null);
            }

            if(lobby.id) {
                const lChannel = await guild.channels.fetch(lobby.id).catch(() => null);
                if(lChannel) await lChannel.delete().catch(error => console.error(`[Blood Clash] Couldn't delete the lobby ${lobby.id}: ${error.message}`));
            }
        }

        // Nettoyage des tables de lobbies et requêtes
        await db.delete(`DELETE FROM bc`);
        await db.delete(`DELETE FROM lobby`);

        // Mise à jour de la liste des demandes d'aide
        await bc.updateList(guild);

        // Message de réinitialisation
        await channel.send({
            content: `# 🚨 ${event.event_name} Blood Clash just started ! 🚨\nHelp requests and lobbies have been reset.\n-# <@&${globals.server.role.bcHelp}>`
        });
    } else {
        const channel = missionBoardChannel ?? await getMissionBoardChannel(client);
        const pingPrefix = event.role_to_ping ? `${event.role_to_ping}: ` : '';
        await channel.send({
            content: `${pingPrefix}${event.event_name} starts in 10 minutes`
        });
    }
}

async function nextDate(eventId) {
    const event = await db.getrow(`SELECT DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "date_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "date_end", event_frequency FROM events WHERE event_id = ?`, [eventId]);
    if (!event) return;

    const dateStart = parseSqlDate(event.date_start);

    // Si pas de fréquence et que l'événement initial est expiré, on l'efface
    if (event.event_frequency == null && new Date().getTime() > dateStart.getTime()) {
        return await db.query(`DELETE FROM events WHERE event_id = ?`, [eventId]);
    } else if (event.event_frequency == null) return;

    const parse = (v) => (v == undefined || v == "*" ? null : Number(v));
    const frequency = event.event_frequency.trim().split(/\s+/);

    const parsed = {
        year: parse(frequency[0]),
        month: parse(frequency[1]),
        date: parse(frequency[2]),
        hour: parse(frequency[3]),
        minute: parse(frequency[4]),
        second: parse(frequency[5]),
    };

    // A frequency without any increment would keep the event at the same date forever
    if (Object.values(parsed).every(v => !v)) {
        console.error(`[Mission board] Event ${eventId} has an invalid frequency : ${event.event_frequency}`);
        return;
    }

    // Ajustement de la nouvelle date de début (et de fin si elle existe), en UTC
    const newDateStart = calendar.addFrequency(dateStart, event.event_frequency);
    const newDateEnd = event.date_end ? calendar.addFrequency(parseSqlDate(event.date_end), event.event_frequency) : null;

    await db.query(`UPDATE events SET event_time_start = ?, event_time_end = ? WHERE event_id = ?`, [toSqlDate(newDateStart), newDateEnd ? toSqlDate(newDateEnd) : null, eventId]);
}

// Find the mission board panel among the last messages of the channel
async function findPanel(channel) {
    const fetched = await channel.messages.fetch({ limit: 20 });
    return fetched.find(m => m.author.id == channel.client.user.id && m.embeds[0]?.title == `Mission Board`) ?? null;
}

async function sendPanel(channel, payload) {
    const message = await channel.send(payload);

    // Publish the panel to the following servers
    if (channel.type == ChannelType.GuildAnnouncement) {
        await message.crosspost().catch(error => console.error("[Panel] Crosspost impossible :", error.message));
    }

    return message;
}

// Add a field, split in several fields if the text is too long for one
function addLongField(embed, name, text) {
    let value = "";

    for (const line of text.split("\n").filter(Boolean)) {
        if (value.length + line.length + 1 > 1024) {
            embed.addFields({ name: `${name}`, value: value });
            value = "";
            name = `${name} (next)`;
        }
        value += `${line}\n`;
    }

    if (value) embed.addFields({ name: `${name}`, value: value });
}

async function editPanel(channel, action) {
    if (action == "delete") {
        try {
            const panel = await findPanel(channel);
            if (panel) await panel.delete();
        } catch (e) {
            console.error("[Panel] Aucun message à effacer :", e.message);
        }
    } else if (action == "create" || action == "edit") {

        // Sélection SQL modifiée pour inclure et trier par event_parent_name
        const events = await db.getall(`SELECT event_name, event_parent_name, DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "date_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "date_end" FROM events WHERE calendar_only = 0 ORDER BY COALESCE(event_parent_name, 'Autre'), event_time_start`);

        // Calendar of the next 7 days, generated from the long events and the "calendar only" ones
        const calendarEvents = await db.getall(`SELECT event_name, event_parent_name, DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "date_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "date_end", event_frequency, calendar_color FROM events WHERE event_time_end IS NOT NULL OR calendar_only = 1`);
        const image = await calendar.render(calendarEvents.map(e => ({
            name: e.event_name,
            parent: e.event_parent_name,
            start: parseSqlDate(e.date_start),
            end: parseSqlDate(e.date_end),
            frequency: e.event_frequency,
            color: e.calendar_color
        })));
        const attachment = new AttachmentBuilder(image, { name: 'calendar.png' });

        const missionBoard = new EmbedBuilder()
            .setTitle(`Mission Board`)
            .setImage(`attachment://calendar.png`)
            .setTimestamp();

        let lastParent = null;
        let schedule = "";

        for (let i = 0; i < events.length; i++) {
            // Utilisation d'un nom de secours si event_parent_name est null dans la BDD
            const currentParent = events[i].event_parent_name || "Événements Généraux";

            if (currentParent !== lastParent) {
                if (lastParent !== null) {
                    addLongField(missionBoard, lastParent, schedule);
                }
                schedule = "";
                lastParent = currentParent;
            }

            const timestampStart = Math.floor(parseSqlDate(events[i].date_start).getTime() / 1000);

            // Inclusion de event_name au début de la ligne pour savoir de quel sous-événement il s'agit
            if (events[i].date_end) {
                const timestampEnd = Math.floor(parseSqlDate(events[i].date_end).getTime() / 1000);

                schedule += `- **${events[i].event_name}**: From <t:${timestampStart}:d> <t:${timestampStart}:t> to <t:${timestampEnd}:d> <t:${timestampEnd}:t>\n`;
            } else {
                schedule += `- **${events[i].event_name}**: <t:${timestampStart}:d> <t:${timestampStart}:t> (<t:${timestampStart}:R>)\n`;
            }
        }

        if (lastParent !== null && schedule !== "") {
            addLongField(missionBoard, lastParent, schedule);
        }

        missionBoard.addFields({ name: `Event calendar`, value: `​` });

        const payload = { embeds: [missionBoard], files: [attachment] };

        if (action == "create") {
            await sendPanel(channel, payload);
        } else if (action == "edit") {
            const panel = await findPanel(channel).catch(() => null);

            if (panel) {
                await panel.edit({ ...payload, attachments: [] });
            } else {
                await sendPanel(channel, payload);
            }
        }
    }
}


export const mb = { missionBoard, editPanel, startMessage, updateEvents, nextDate };
