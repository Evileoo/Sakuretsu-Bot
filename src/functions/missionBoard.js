import { AttachmentBuilder, EmbedBuilder, SectionComponent } from 'discord.js';
import schedule from 'node-schedule';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

function parseSqlDate(sqlTimeString) {
    if (!sqlTimeString) return null;
    const [year, month, day, hour, minute, second] = sqlTimeString.split(" ");
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

async function missionBoard(client) {
    // Mise à jour des événements au démarrage du bot (au cas où il était éteint pendant un événement)
    await updateEvents(client);

    // Routine de vérification toutes les minutes
    const missionBoardUpdates = schedule.scheduleJob('0 */1 * * * *', async function() {
        await updateEvents(client);
    });
}


async function updateEvents(client) {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));

    const events = await db.getall(`SELECT *, DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "time_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "time_end" FROM events ORDER BY event_parent_name, event_time_start ASC`);
    if(events.length == 0) return;

    // Récupération du salon Discord
    const guild = await client.guilds.fetch(`${globals.server.id}`);
    //const channel = await guild.channels.cache.get(globals.server.channel.missionBoard);
    const channel = await guild.channels.cache.get(`1485202060973576212`);

    for(const event of events) {
        // Get event start date
        const nextStartDate = parseSqlDate(event.time_start);
        const timeBeforeStart = nextStartDate.getTime() - utcNow.getTime();

        if(!event.time_end) { // ponctual events
            if(timeBeforeStart == 10 * 60 * 1000) { // 10 minutes before start
                // Delete the mission board panel
                await editPanel(channel, "delete");

                // Send the start message
                await startMessage(client, event);

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

            if(event.event_parent_name == "Blood Clash") {
                if(timeBeforeEnd <= 0) {
                    // Calculate following dates
                    await nextDate(event.event_id);

                    // Refresh the panel
                    await editPanel(channel, "edit");

                } else if(timeBeforeStart == 0) {
                    // Execute specific event
                    await startMessage(client, event);
                }
            } else {
                
            }
        }
    }
}

async function startMessage(client, event) {
    if (event.event_parent_name === "Blood Clash") {

        const guild = await client.guilds.fetch(globals.server.id)

        //const channel = await guild.channels.fetch(globals.server.channel.bloodClash);
        const channel = await guild.channels.fetch("1543549008402714645");

        // Suppression des salons d'aide
        const lobbies = await db.getall(`SELECT id, message FROM lobby`);

        for(const lobby of lobbies) {
            if(lobby.message) {
                const message = await channel.messages.fetch(lobby.message);
                await message.delete();
            }

            const lChannel = await guild.channels.fetch(lobby.id);
            await lChannel.delete();
        }

        // Nettoyage des tables de lobbies et requêtes
        await db.delete(`DELETE FROM bc`);
        await db.delete(`DELETE FROM lobby`);

        // Mise à jour du panel
        //await editPanel(await client.guild.channels.fetch(globals.server.channel.bcHelp), "edit");
        await editPanel(await guild.channels.fetch("1543548395891859506"), "edit");

        // Message de réinitialisation
        await channel.send({
            content: `# 🚨 ${event.event_name} Blood Clash just started ! 🚨\nHelp requests and lobbies have been reset.\n-# <@&${globals.server.role.bcHelp}>`
        });
    } else {
        //const channel = await client.channels.fetch(globals.server.channel.missionBoard);
        const pingPrefix = event.role_to_ping ? `${event.role_to_ping}: ` : '';
        await channel.send({
            content: `${pingPrefix}${event.event_name} starts in 10 minutes`
        });
    }
}

async function endMessage(client, event) {
    
}

async function nextDate(eventId) {
    const event = await db.getrow(`SELECT DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "date_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "date_end", event_frequency FROM events WHERE event_id = ?`, [eventId]);
    if (!event) return;

    let date = event.date_start.split(" ");
    const dateStart = new Date(date[0], date[1] - 1, date[2], date[3], date[4], date[5]);

    // Si pas de fréquence et que l'événement initial est expiré, on l'efface via db.query
    if (event.event_frequency == null && new Date().getTime() > dateStart.getTime()) {
        return await db.query(`DELETE FROM events WHERE event_id = ?`, [eventId]);
    } else if (event.event_frequency == null) return;

    const parse = (v) => (v == "*" ? null : Number(v));

    const parsed = {
        year: parse(event.event_frequency.split(" ")[0]),
        month: parse(event.event_frequency.split(" ")[1]),
        date: parse(event.event_frequency.split(" ")[2]),
        hour: parse(event.event_frequency.split(" ")[3]),
        minute: parse(event.event_frequency.split(" ")[4]),
        second: parse(event.event_frequency.split(" ")[5]),
    };

    // Ajustement de la nouvelle date de début
    const newDateStart = new Date(dateStart.getTime());
    if (parsed.year != null) newDateStart.setFullYear(newDateStart.getFullYear() + parsed.year);
    if (parsed.month != null) newDateStart.setMonth(newDateStart.getMonth() + parsed.month);
    if (parsed.date != null) newDateStart.setDate(newDateStart.getDate() + parsed.date);
    if (parsed.hour != null) newDateStart.setHours(newDateStart.getHours() + parsed.hour);
    if (parsed.minute != null) newDateStart.setMinutes(newDateStart.getMinutes() + parsed.minute);
    if (parsed.second != null) newDateStart.setSeconds(newDateStart.getSeconds() + parsed.second);

    // Ajustement de la nouvelle date de fin (si elle existe)
    let newDateEnd = null;
    if (event.date_end) {
        date = event.date_end.split(" ");
        const dateEnd = new Date(date[0], date[1] - 1, date[2], date[3], date[4], date[5]);
        newDateEnd = new Date(dateEnd.getTime());
        
        if (parsed.year != null) newDateEnd.setFullYear(newDateEnd.getFullYear() + parsed.year);
        if (parsed.month != null) newDateEnd.setMonth(newDateEnd.getMonth() + parsed.month);
        if (parsed.date != null) newDateEnd.setDate(newDateEnd.getDate() + parsed.date);
        if (parsed.hour != null) newDateEnd.setHours(newDateEnd.getHours() + parsed.hour);
        if (parsed.minute != null) newDateEnd.setMinutes(newDateEnd.getMinutes() + parsed.minute);
        if (parsed.second != null) newDateEnd.setSeconds(newDateEnd.getSeconds() + parsed.second);
    }

    await db.query(`UPDATE events SET event_time_start = ?, event_time_end = ? WHERE event_id = ?`, [newDateStart, newDateEnd, eventId]);
}

async function editPanel(channel, action) {
    if (action == "delete") {
        try {
            const fetched = await channel.messages.fetch({ limit: 1 });
            if (fetched.size > 0) await fetched.last().delete();
        } catch (e) {
            console.error("[Panel] Aucun message à effacer :", e.message);
        }
    } else if (action == "create" || action == "edit") {

        // Sélection SQL modifiée pour inclure et trier par event_parent_name
        const events = await db.getall(`SELECT event_name, event_parent_name, DATE_FORMAT(event_time_start, '%Y %m %d %H %i %s') AS "date_start", DATE_FORMAT(event_time_end, '%Y %m %d %H %i %s') AS "date_end" FROM events ORDER BY COALESCE(event_parent_name, 'Autre'), event_time_start`);

        // Syntaxe corrigée de l'AttachmentBuilder
        const attachment = new AttachmentBuilder('./data/calendar.png', { name: 'calendar.png' });

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
                    missionBoard.addFields({ name: `${lastParent}`, value: `${schedule}` });
                }
                schedule = "";
                lastParent = currentParent;
            }

            const sParts = events[i].date_start.split(" ");
            const dStart = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2], sParts[3], sParts[4], sParts[5]));
            const timestampStart = Math.floor(dStart.getTime() / 1000);

            // Inclusion de event_name au début de la ligne pour savoir de quel sous-événement il s'agit
            if (events[i].date_end) {
                const eParts = events[i].date_end.split(" ");
                const dEnd = new Date(Date.UTC(eParts[0], eParts[1] - 1, eParts[2], eParts[3], eParts[4], eParts[5]));
                const timestampEnd = Math.floor(dEnd.getTime() / 1000);
                
                schedule += `- **${events[i].event_name}**: From <t:${timestampStart}:d> <t:${timestampStart}:t> to <t:${timestampEnd}:d> <t:${timestampEnd}:t>\n`;
            } else {
                schedule += `- **${events[i].event_name}**: <t:${timestampStart}:d> <t:${timestampStart}:t> (<t:${timestampStart}:R>)\n`;
            }
        }

        if (lastParent !== null && schedule !== "") {
            missionBoard.addFields({ name: `${lastParent}`, value: `${schedule}` });
        }

        missionBoard.addFields({ name: `Event calendar`, value: `\u200b` });

        const payload = { embeds: [missionBoard], files: [attachment] };

        if (action == "create") {
            await channel.send(payload);
        } else if (action == "edit") {
            try {
                const fetched = await channel.messages.fetch({ limit: 1 });
                if (fetched.size > 0) {
                    await fetched.last().edit(payload);
                } else {
                    await channel.send(payload);
                }
            } catch (e) {
                await channel.send(payload);
            }
        }
    }
}


export const mb = { missionBoard, editPanel, startMessage };