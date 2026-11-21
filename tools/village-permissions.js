// Sets the Kage and BroKage permissions on the existing villages (new villages get them from /village create):
// - category: "Manage Channels" (create, edit and delete their own channels) and "Mention @everyone, @here and All Roles"
// - the channels made by the bot (flow, rules, announcements, general, moderation): mentions allowed, "Manage Channels" denied
// - the other channels of the category: same permissions as the category, the Kage and the BroKages manage them
// The other permissions of the overwrites are kept. It can be run again safely: it only changes what is missing.
// REST only: it can run while the bot is running.
//
// Usage: node --env-file .env ./tools/village-permissions.js [--dry-run]
import { REST, Routes, PermissionsBitField } from 'discord.js';
import { globals } from '../src/globals.js';
import { db } from '../src/connections/database.js';

const dryRun = process.argv.includes('--dry-run');
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const { ManageChannels, MentionEveryone } = PermissionsBitField.Flags;
const roles = [globals.server.role.kage, globals.server.role.sub];

const villages = await db.getall(`SELECT tag, name, category, flow, rules, moderation FROM village ORDER BY tag`);
const channels = await rest.get(Routes.guildChannels(globals.server.id));

let edited = 0;
async function setOverwrite(village, channel, role, allowBits, denyBits) {
    const overwrite = channel.permission_overwrites?.find(o => o.id == role);
    const allow = (BigInt(overwrite?.allow ?? 0) | allowBits) & ~denyBits;
    const deny = (BigInt(overwrite?.deny ?? 0) | denyBits) & ~allowBits;
    if(overwrite && allow == BigInt(overwrite.allow) && deny == BigInt(overwrite.deny)) return;

    console.log(`[${village.tag}] ${channel.type == 4 ? `category` : `#${channel.name}`} role ${role}: allow ${new PermissionsBitField(allow).toArray().join(', ') || '-'} / deny ${new PermissionsBitField(deny).toArray().join(', ') || '-'}${dryRun ? ` (dry run)` : ``}`);
    edited++;
    if(dryRun) return;

    await rest.put(Routes.channelPermission(channel.id, role), {
        body: { type: 0, allow: String(allow), deny: String(deny) },
        reason: `Kage and BroKages manage their village channels`
    });
}

for(const village of villages) {
    const category = channels.find(c => c.id == village.category);
    if(!category) {
        console.log(`[${village.tag}] ${village.name}: category ${village.category} not found, skipped`);
        continue;
    }

    // announcements and general are not saved in the database: found by their name
    const botChannel = (channel) => [village.flow, village.rules, village.moderation].includes(channel.id) || [`announcements`, `general`].includes(channel.name);

    for(const role of roles) {
        await setOverwrite(village, category, role, ManageChannels | MentionEveryone, 0n);
        for(const channel of channels.filter(c => c.parent_id == category.id)) {
            if(botChannel(channel)) await setOverwrite(village, channel, role, MentionEveryone, ManageChannels);
            else await setOverwrite(village, channel, role, ManageChannels | MentionEveryone, 0n);
        }
    }
}

console.log(`${edited} overwrite(s) ${dryRun ? `to edit` : `edited`}`);
process.exit(0);
