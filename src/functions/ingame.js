import { EmbedBuilder } from 'discord.js';
import schedule from 'node-schedule';

const guildId = "1478130301552033982";
const eventChannel = "1478133200109965497";

async function eventPanel(client) {

    // Create panel update routine
    const missionBoardUpdates = schedule.scheduleJob('0 */1 * * * *', async function() {
        // Get date
        const now = new Date();

        // Get guild and channel objects
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.cache.get(eventChannel);

        // Events array
        const events = [
            {
                name: "Leaf Village Defense - Auctions",
                dates: [
                    "* * * 12 0 0", // Event at 12 UTC
                    "* * * 20 0 0", // Event at 20 UTC
                ],
                roleToPing: "1478135570696769638",
                pingDuration: 30, // Keep the ping for 30 minutes
                pingBefore: 10, // Ping 10 minutes before the event starts
                nextEvent: "* * 1 * * *" // Next event the next day
            },
            {
                name: "Arena - Betting Contest",
                dates: [
                    "* * 0 21 5 *" // Event on sunday at 21.05 UTC
                ],
                roleToPing: "1479552402863558727",
                pingDuration: 45,
                pingBefore: 10,
                nextEvent: "* * 7 * * *"
            },
        ];

        // Get the panel message
        const deleteFetched = await channel.messages.fetch({limit:100});
        const panel = deleteFetched.last();

        // Delete outdated messages
        for(const element of deleteFetched) {
            if(element[0] != panel) {
                const index = events.findIndex(event => element[1].content.includes(event.name));

                if(index == -1 || !checkPing(events[index])) {
                    await element[1].delete();
                }
                
            }
        };

        
        // Create discord embed
        const missionBoard = new EmbedBuilder()
        .setTitle(`Mission Board`)
        .setTimestamp()

        // Add in game events timers
        for(let i=0; i < events.length; i++) {
            const date = getNextEvent(events[i]);

            const sentance = `<t:${date / 1000}:t> : <t:${date / 1000}:R>`;

            missionBoard.addFields({name: `${events[i].name}`, value: `${sentance}`});
        }


        // Update the panel
        if(panel) { // Panel is here
            await panel.edit({
                embeds: [missionBoard]
            });
        } else { // Panel is not here
            await channel.send({
                embeds: [missionBoard]
            });
        }

        // Get already pinged 
        const ignoreFetched = await channel.messages.fetch({limit:100});
        const ignoreEvents = [];
        for(const element of ignoreFetched) {
            if(element[0] != panel) {
                const index = events.findIndex(event => element[1].content.includes(event.name));

                if(index != -1) ignoreEvents.push(events[index].name);
                
            }
        };

        // Ping if not already done
        for(const event of events) {
            if(checkPing(event) && !ignoreEvents.some(ignore => event.name == ignore)) {
                channel.send(`<@&${event.roleToPing}>, ${event.name} starts in ${event.pingBefore} minutes`);
            }
        }

    });
}

function parsePattern(pattern) {
    // On récupère les dates sous forme de tableau
    const [year, month, day, hour, minute, second] = pattern.split(" ");

    // On convertit la date en null ou en nombre
    const parse = (v) => (v === "*" ? null : Number(v));

    // On revoit l'objet avec les dates en numérique
    return {
        year: parse(year),
        month: parse(month),
        day: parse(day),
        hour: parse(hour),
        minute: parse(minute),
        second: parse(second)
    };
}

function matches(date, pattern) {
    // On check si on est au temps t
    if(pattern.year !== null && date.getUTCFullYear() !== pattern.year) return false;
    if(pattern.month !== null && date.getUTCMonth() !== pattern.month) return false;
    if(pattern.day !== null && date.getUTCDay() !== pattern.day) return false;
    if(pattern.hour !== null && date.getUTCHours() !== pattern.hour) return false;
    if(pattern.minute !== null && date.getUTCMinutes() !== pattern.minute) return false;
    if(pattern.second !== null && date.getUTCSeconds() !== pattern.second) return false;

    return true;
}

function nextMatchingDate(pattern, from) {
    const p = parsePattern(pattern);

    const date = new Date(from);
    date.setUTCMilliseconds(0);
    date.setUTCSeconds(0);

    for(let i=0; i< 60*24*365*4; i++) {
        if(matches(date, p)) {
            return new Date(date);
        }

        date.setUTCMinutes(date.getUTCMinutes() + 1);
    }
}

function getNextEvent(config){
    const now = new Date();

    const candidates = config.dates.map((pattern) => nextMatchingDate(pattern,now));

    let next = (candidates.length > 1) ? candidates.sort((a, b) => a - b)[0] : candidates[0];

    const expire = new Date(next.getTime() + config.pingDuration * 60000);

    if(now > expire) {
        const nextCycle = nextMatchingDate(config.nextEvent, now);
        const diff = now - expire;

        next = new Date(nextCycle.getTime() + diff);
    }

    return next;
}

function checkPing(config) {
  const now = new Date();
  const eventDate = getNextEvent(config);

  const pingStart = new Date(eventDate.getTime() - config.pingBefore * 60000);
  const pingEnd = new Date(eventDate.getTime() + config.pingDuration * 60000);

  if (now >= pingStart && now <= pingEnd) {
    return true;
  }

  return false;
}

export const ingame = {eventPanel};