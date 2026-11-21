import { EmbedBuilder } from 'discord.js';

const days = [
    { key: `Mon`, name: `Monday` },
    { key: `Tue`, name: `Tuesday` },
    { key: `Wed`, name: `Wednesday` },
    { key: `Thu`, name: `Thursday` },
    { key: `Fri`, name: `Friday` },
    { key: `Sat`, name: `Saturday` },
    { key: `Sun`, name: `Sunday` },
];

// Convert a "HH:MM" local time of the member into a discord timestamp (today, UTC based)
function toTimestamp(time, offset, now) {
    const [hour, minute] = time.split(":").map(v => parseInt(v));
    const utcMinutes = hour * 60 + minute - Math.round(offset * 60);

    const date = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, utcMinutes, 0);
    return Math.floor(date / 1000);
}

// Build the schedule embed of a member
// member: row with name and timezone, schedule: rows with day and period ("HH:MM HH:MM")
function buildScheduleEmbed(member, schedule) {
    const now = new Date();
    const offset = parseFloat(member.timezone) || 0;

    const embed = new EmbedBuilder()
    .setTitle(`${member.name ?? `Unknown`}'s availibilities`)
    .setTimestamp();

    for(const day of days) {
        const periods = schedule
        .filter(row => row.day == day.key && row.period && row.period.split(" ").length == 2)
        .map(row => {
            const [start, end] = row.period.split(" ");
            const startTimestamp = toTimestamp(start, offset, now);
            let endTimestamp = toTimestamp(end, offset, now);

            // Period going over midnight (ex: 22:00 02:00) ends the next day
            if(endTimestamp <= startTimestamp) endTimestamp += 24 * 60 * 60;

            return `<t:${startTimestamp}:T> to <t:${endTimestamp}:T>`;
        });

        embed.addFields({ name: `${day.name}`, value: periods.length > 0 ? periods.join(" / ") : `Unknown` });
    }

    return embed;
}

export const scheduleEmbed = { buildScheduleEmbed };
