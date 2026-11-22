import { ButtonStyle, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags, ChannelType, REST } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { docs } from './docs.js';

// Current Blood Clash event data : [max floor, lobby size]
async function getBcEventData() {
    const event = await db.getrow(`SELECT event_name, event_data FROM events WHERE event_parent_name = 'Blood Clash' AND calendar_only = 0 AND CURRENT_TIMESTAMP() >= event_time_start AND CURRENT_TIMESTAMP < event_time_end`);
    if(!event) return null;

    const data = (event.event_data ?? "").split(globals.separator);
    return {
        name: event.event_name,
        maxFloor: isNaN(parseInt(data[0])) ? null : parseInt(data[0]),
        lobbySize: isNaN(parseInt(data[1])) ? null : parseInt(data[1])
    };
}

// Delete a message of the bc channel without failing if it has already been deleted
async function deleteBcMessage(guild, messageId) {
    if(!messageId) return;

    const bcChannel = await guild.channels.fetch(globals.server.channel.bloodClash).catch(() => null);
    if(bcChannel) await bcChannel.messages.delete(messageId).catch(() => null);
}

async function filter(message) {
    // Don't filter bot messages
    if(message.author.bot || !message.content) {
        return;
    }

    const channel = message.channel;

    // Define which filter to apply
    const ignore = channel.parentId != globals.server.channel.bcCategory && channel.parentId != globals.server.channel.bcLobbies;
    if(ignore) return;

    if(channel.id == globals.server.channel.bloodClash) {
        await inBcChannel(message);
    } else if(channel.id == globals.server.channel.bcHelp || channel.parentId == globals.server.channel.bcLobbies) {
        await inHelperChannel(message)
    } else {
        await notInBcChannel(message);
    }
}

async function notInBcChannel(message) {
    // Check if member has the bc trust role
    if (await message.member.roles.cache.has("1541526168006688808")) return;

    const request = defineIfRequest(message.content);

    if(request.score >= 50) {
        // Reply
        await message.reply({
            content: `Help requests are not allowed in this channel. Please ask in <#${globals.server.channel.bloodClash}>.\nConsecutive requests outside <#${globals.server.channel.bloodClash}> channel will lead to a mute.`
        });

        // Delete original message
        await message.delete();
        
        // Create a spam row in db
        await db.insert(`INSERT INTO bc (r_id, state) VALUES (?, ?)`, [message.author.id, 2]);
        await applySanction(message).catch(error => console.error(`[Blood Clash] Couldn't sanction ${message.author.id}: ${error.message}`));
    } else if(request.score > 35) {
        // create the component
        const yesButton = new ButtonBuilder()
        .setCustomId(`bcSpam|||y|||${message.channel.id}|||${message.id}`)
        .setLabel(`Yes`)
        .setStyle(ButtonStyle.Primary);

        const noButton = new ButtonBuilder()
        .setCustomId(`bcSpam|||n|||${message.channel.id}|||${message.id}`)
        .setLabel(`No`)
        .setStyle(ButtonStyle.Primary);

        const decision = new ActionRowBuilder()
        .addComponents(yesButton, noButton);

        // Ask to mods if the message is a spam
        const channel = await message.guild.channels.fetch(globals.server.channel.automod);
        await channel.send({
            content: `Is this message a blood clash help request ?\n${message.content.slice(0, 1800).split("\n").map(line => `> ${line}`).join("\n")}`,
            components: [decision]
        });
    }
}

async function inBcChannel(message) {
    const request = defineIfRequest(message.content);

    // Check if a request has already been created
    const bc = await db.getrow(`SELECT floor, state FROM bc WHERE r_id = ? AND state <> 2`, [message.author.id]);

    // End if no floor or score <= 50
    if(request.score >= 50 && request.floor == null) {
        return await message.reply({
            content: `If you just sent a help request, please precise the floor you start from\nexample : help bc floor 756. (change the floor of the example with yours)`
        });
    } else if(!bc && request.score > 35 && request.score < 50) {
        return await message.reply({
            content: `If this is a help request, please be more straight forward. I recommand you to say : help bc floor 756. (change the floor of the example with yours)`
        });
    } else if(request.score <= 35) return;

    if(request.floor == null) {
        return await message.reply({
            content: `Please provide your starting floor.\nHelp request example : help bc floor 1500`
        });
    }

    // Check if floor is above the max floor
    const event = await getBcEventData();
    if(event && event.maxFloor != null && request.floor >= event.maxFloor) {
        return await message.reply({
            content: `Your request is above the max Blood Clash floor (${event.maxFloor}).`
        });
    }

    const pingAmount = message.mentions.users.size - (message.mentions.repliedUser && message.mentions.users.has(message.mentions.repliedUser.id) ? 1 : 0);

    if(pingAmount > 0) {
        return await message.reply({
            content: `You cannot ping members in this channel.`
        });
    }

    if(bc) {

        const member = await db.getrow(`SELECT ig_id, name FROM member WHERE id = ?`, [message.author.id]);
        const alerts = await profileAlerts(message.author.id, member);

        if(request.floor == bc.floor) {
            await message.reply({
                content: `You will be able to ask for help again after having push some floors.${alerts}`
            });
            await db.insert(`INSERT INTO bc (r_id, state) VALUES (?, 2)`, [message.author.id]);
            return await message.delete();
        }

        if(bc.state == 1) {
            await message.reply({
                content: `You cannot ask for help while someone is helping you. Leave the helper's lobby to ask for help`
            });
            await db.insert(`INSERT INTO bc (r_id, state) VALUES (?, 2)`, [message.author.id]);
            return await message.delete();
        }

        await db.update(`UPDATE bc SET floor = ? WHERE r_id = ? AND state = 0`, [request.floor, message.author.id]);

        await message.reply({
            content: `Request updated, new floor is ${request.floor}.${alerts}`
        });

        await updateList(message.guild);
    } else {

        const member = await db.getrow(`SELECT * FROM member WHERE id = ?`, [message.author.id]);
        if(!member) {
            await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [message.author.id, message.author.displayName ?? message.author.username]);
        }
        // A new member still gets the advices about his in-game name and ID
        const alerts = await profileAlerts(message.author.id, member);

        await db.insert(`INSERT INTO bc (r_id, floor, state) VALUES (?, ?, 0)`, [message.author.id, request.floor]);

        await message.reply({
            content: `Request created. You don't need to send an other one this week except if your floor changes.${alerts}`
        });

        await updateList(message.guild);
    }
}

// Advice given with a help request when the profile of the member is incomplete
async function profileAlerts(id, member) {
    const schedule = await db.getrow(`SELECT DISTINCT id FROM schedule WHERE id = ?`, [id]);
    const alerts = [];

    if(!member || member.name == null) alerts.push(`- Give your in-game name with \`/my name\` : helpers pick known players first`);
    if(!member || member.ig_id == null) alerts.push(`- Give your in-game ID with \`/my id\` : helpers will find you faster`);
    if(!schedule) alerts.push(`- Give the time when you're usually available with \`/schedule edit\` (${docs.mention(`schedule`, `see the documentation`)})`);

    if(alerts.length == 0) return ``;

    return `\n${alerts.join(`\n`)}\nHow to do it : ${docs.mention(`profile`)}. How to use commands : ${docs.mention(`start-here`)}`;
}

async function inHelperChannel(message) {
    const content = message.content.toLowerCase();

    let deleteMessage = true;
    switch(content.split(" ")[0]) {
        case "max":
            await setMaxFloor(message);
        break;
        case "id":
            await setId(message);
        break;
        case "help":
            await help(message);
        break;
        case "cancel":
            await cancel(message);
        break;
        case "finish":
            await finish(message);
        break;
        case "blacklist":
            await blacklist(message);
        break;
        case "whitelist":
            await whitelist(message);
        break;
        case "lobby":
            switch(content.split(" ")[1]) {
                case "open":
                    await lOpen(message);
                break;
                case "close":
                    await lClose(message);
                break;
                case "cancel":
                    await lCancel(message);
                break;
                case "finish":
                    await lFinish(message);
                break;
                case "floor":
                    await lFloor(message);
                break;
                default:
                break;
            }
        break;
        default:
            deleteMessage = false;
        break;
    }

    // Update the request list
    await updateList(message.guild);

    // Delete the command message
    if(deleteMessage || message.channel.id == globals.server.channel.bcHelp) await delayedMessageDelete(message, 10000);
}

async function setMaxFloor(message) {

    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 3 || split[1] != "floor" || isNaN(split[2])) {
        const reply = await message.reply({
            content: `Please follow the given format : "max floor 1500"`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const member = await db.getrow(`SELECT id FROM member WHERE id = ?`, [message.author.id]);

    if(!member) {
        const reply = await message.reply({
            content: `You must be registered to the bot. Execute the commands \`/my name\` and give your in game name.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const event = await getBcEventData();
    const maxFloor = event?.maxFloor ?? globals.vars.maxBcFloor;

    if(parseInt(split[2]) > maxFloor) {
        const reply = await message.reply({
            content: `You can't set up a max floor above the current in game max floor (${maxFloor})`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await db.update(`UPDATE member SET max_floor = ? WHERE id = ?`, [parseInt(split[2]), message.author.id]);

    const reply = await message.reply({
        content: `Max floor updated to ${split[2]}`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

async function setId(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 2 || isNaN(split[1])) {
        const reply = await message.reply({
            content: `Please follow the given format : "id 123456789"`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const member = await db.getrow(`SELECT id FROM member WHERE id = ?`, [message.author.id]);

    if(!member) {
        const reply = await message.reply({
            content: `You must be registered to the bot. Execute the commands \`/my name\` and give your in game name.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await db.update(`UPDATE member SET ig_id = ? WHERE id = ?`, [split[1], message.author.id]);

    const reply = await message.reply({
        content: `Ingame ID updated to ${split[1]}`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

async function help(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 2 || isNaN(split[1])) {
        const reply = await message.reply({
            content: `Please follow the given format : "help 4" (replace 4 by the request you want to help)`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const helper = await db.getrow(`SELECT * FROM member WHERE id = ?`, [message.author.id]);

    const request = await db.getrow(`SELECT * FROM bc WHERE id = ? AND state <> 2`, [split[1]]);

    if(!request) {
        const reply = await message.reply({
            content: `This request doesn't exist, pick up a number from the "Request ID" column`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    if(!helper) {
        const reply = await message.reply({
            content: `First, register into the bot by typing the \`my name\` command`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    if(helper.id == request.r_id) {
        const reply = await message.reply({
            content: `You can't help yourself`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    if(request.state == 1) {
        const reply = await message.reply({
            content: `This member is already being helped`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    if(!helper.max_floor) {
        const reply = await message.reply({
            content: `You have to give the max floor you can reach to the bot, type "max floor 1500" (replace the 1500 by the floor you can reach solo).\nIf you're in a lobby that can reach higher than your max floor. Use the command "lobby floor 1500"`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const blacklist = await db.getrow(`SELECT 1 FROM blacklist WHERE executor = ? AND target = ?`, [message.author.id, request.r_id]);

    if(blacklist) {
        const reply = await message.reply({
            content: `You have blacklisted this member, you can't help him unless you type "whitelist 4" or "whitelist @member" (replace 4 by the id of the request or @member by the member)`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [message.author.id]);

    if(lobby) {
        if(parseInt(lobby.max_floor) <= request.floor) {
            const reply = await message.reply({
                content: `Your lobby isn't enough to get this member higher. Help someone else`
            });
            delayedMessageDelete(reply, 10000);
            return;
        }
    } else {
        if(helper.max_floor <= request.floor) {
            const reply = await message.reply({
                content: `You can't help someone who's at the same floor or above as your max.`
            });
            delayedMessageDelete(reply, 10000);
            return;
        }
    }

    const event = await getBcEventData();

    if(event && event.lobbySize != null) {
        const helping = await db.getval(`SELECT COUNT(*) FROM bc WHERE h_id = ? AND state = 1`, [message.author.id]);

        if(helping >= event.lobbySize) {
            const reply = await message.reply({
                content: `Your lobby is full. You can't add anyone else yet.`
            });
            delayedMessageDelete(reply, 10000);
            return;
        }
    }

    const helped = await db.getrow(`SELECT * FROM member WHERE id = ?`, [request.r_id]);

    let channel;
    if(!lobby) {
        // Create the channel
        channel = await message.guild.channels.create({
            name: `${helper.name} lobby`,
            type: ChannelType.GuildText,
            parent: globals.server.channel.bcLobbies
        });
        await channel.permissionOverwrites.edit(helper.id, {
            ViewChannel: true
        });
        await channel.permissionOverwrites.edit(request.r_id, {
            ViewChannel: true
        });

        await db.insert(`INSERT INTO lobby (id, max_floor, host, privacy) VALUES (?, ?, ?, 0)`, [channel.id, helper.max_floor, helper.id]);

        // Send default message
        await channel.send({
            content: `Welcome to <@${helper.id}>'s lobby <@${request.r_id}>.\nYou will start from floor ${request.floor} and will go to floor ${helper.max_floor}.`
        });

        await channel.send({
            content: `Here are the commands you can use here. No need to do a \`/\` before, you type them in chat normally.\n- **id 123** : replace the 123 by your ingame ID\n- **cancel @member** : the @member means you have to ping the member you want to cancel. It will put him back in the help requests pool without changing his floor.\n- **finish @member 1500** : replace @member by pinging the member you finished helping. Replace 1500 by the floor you stopped at.\n- **lobby open** : while make this lobby public until full. People will be able to join.\n- **lobby close** : make this lobby private again.\n- **lobby floor 1550** : increase the max floor you can help people at. Let's say your max floor is 1450 and you're with someone who can get to 1550, do this command to be able to help people above 1450 without changing your personal max floor.\n- **lobby finish 1500** : completely closes the lobby for every member in it.\n- **lobby cancel** : ends a lobby without updating helped members floors`
        });

        await channel.send({
            content: `<@${helper.id}>'s in game ID : ${helper.ig_id || "Not given"}\n<@${request.r_id}>'s in game ID : ${(helped && helped.ig_id != null) ? helped.ig_id : "Not given"}`
        });

    } else {
        // Add the helped member into the lobby
        channel = await message.guild.channels.fetch(lobby.id);
        await channel.permissionOverwrites.edit(request.r_id, {
            ViewChannel: true
        });

        // send message
        await channel.send({
            content: `<@${request.r_id}> joined the lobby. His in game ID is ${(helped && helped.ig_id != null) ? helped.ig_id : "not given"}`
        });
    }

    // Update the request state
    await db.update(`UPDATE bc SET state = 1, h_id = ?, channel_id = ? WHERE id = ?`, [message.author.id, channel.id, parseInt(split[1])]);

    const reply = await message.reply({
        content: `${!lobby ? `Lobby created, head to <#${channel.id}>` : `Member added to the lobby`}`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

async function cancel(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 2 || (isNaN(split[1]) && !message.mentions.users.first())) {
        const reply = await message.reply({
            content: `Please follow the given format : "cancel 4" (where 4 is the request ID) or "cancel @member" (where @member is the member the you want to cancel)`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    let request;
    if(message.mentions.users.first()) {
        request = await db.getrow(`SELECT * FROM bc WHERE r_id = ? AND state = 1`, [message.mentions.users.first().id]);
    } else {
        request = await db.getrow(`SELECT * FROM bc WHERE id = ? AND state = 1`, [split[1]]);
    }

    if(!request || (request.h_id != message.author.id && request.r_id != message.author.id)) {
        const reply = await message.reply({
            content: `You are currently not helping this member`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL WHERE id = ?`, [request.id]);

    const channel = request.channel_id ? await message.guild.channels.fetch(request.channel_id).catch(() => null) : null;
    if(channel) {
        await channel.permissionOverwrites.edit(request.r_id, {
            ViewChannel: false
        });

        // send message
        await channel.send({
            content: `<@${request.r_id}> left the lobby.`
        });
    }

    const reply = await message.reply({
        content: `Help cancelled`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

async function finish(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 3 || (isNaN(split[1]) && !message.mentions.users.first()) || isNaN(split[2])) {
        const reply = await message.reply({
            content: `Please follow the given format : "finish 4 1500" where 4 is the request ID and 1500 the floor you stopped at. You can replace the "4" by pinging the member you helped`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    let request;
    if(message.mentions.users.first()) {
        request = await db.getrow(`SELECT * FROM bc WHERE r_id = ? AND state = 1`, [message.mentions.users.first().id]);
    } else {
        request = await db.getrow(`SELECT * FROM bc WHERE id = ? AND state = 1`, [split[1]]);
    }

    if(!request || (request.h_id != message.author.id && request.r_id != message.author.id)) {
        const reply = await message.reply({
            content: `You are currently not helping this member`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    // Check if floor is above the max floor
    const event = await getBcEventData();
    const maxFloor = event?.maxFloor ?? globals.vars.maxBcFloor;

    if(event && event.maxFloor != null && parseInt(split[2]) > event.maxFloor) {
        const reply = await message.reply({
            content: `You can't close above the max BC floor`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    if(parseInt(split[2]) < maxFloor) {
        await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL, floor = ? WHERE id = ?`, [parseInt(split[2])+1, request.id]);
    } else {
        await db.delete(`DELETE FROM bc WHERE id = ?`, [request.id]);
    }

    const channel = request.channel_id ? await message.guild.channels.fetch(request.channel_id).catch(() => null) : null;
    if(channel) await channel.permissionOverwrites.edit(request.r_id, {
        ViewChannel: false
    });

    const reply = await message.reply({
        content: `Session finished for <@${request.r_id}>`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

// Member targeted by a blacklist/whitelist command : mentioned member, or requester of the given request ID
async function getTargetId(message, value) {
    if(message.mentions.users.first()) return message.mentions.users.first().id;

    const request = await db.getrow(`SELECT r_id FROM bc WHERE id = ? OR r_id = ? LIMIT 1`, [value, value]);
    return request ? request.r_id : null;
}

async function blacklist(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 2 || (isNaN(split[1]) && !message.mentions.users.first())) {
        const reply = await message.reply({
            content: `Please follow the given format : "blacklist 4" or "blacklist @member". replace for by the ID of the request or @member by pinging the member you want to blacklist. You won't be able to help a blacklisted member`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const id = await getTargetId(message, split[1]);
    if(!id) {
        const reply = await message.reply({
            content: `This request doesn't exist, pick up a number from the "Request ID" column`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }
    

    const isBl = await db.getval(`SELECT 1 FROM blacklist WHERE executor = ? AND target = ?`, [message.author.id, id]);
    if(isBl) {
        const reply = await message.reply({
            content: `This member is already blacklisted`
        });
        delayedMessageDelete(reply, 10000);
        return;
    } else {
        await db.insert(`INSERT INTO blacklist (executor, target) VALUES (?, ?)`, [message.author.id, id]);
        const reply = await message.reply({
            content: `Member blacklisted`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }
}

async function whitelist(message) {
    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 2 || (isNaN(split[1]) && !message.mentions.users.first())) {
        const reply = await message.reply({
            content: `Please follow the given format : "whitelist 4" or "whitelist @member". replace 4 by the ID of the request or @member by pinging the member you want to whitelist.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const id = await getTargetId(message, split[1]);
    if(!id) {
        const reply = await message.reply({
            content: `This request doesn't exist, pick up a number from the "Request ID" column`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }
    

    const isBl = await db.getval(`SELECT 1 FROM blacklist WHERE executor = ? AND target = ?`, [message.author.id, id]);
    if(!isBl) {
        const reply = await message.reply({
            content: `This member isn't blacklisted`
        });
        delayedMessageDelete(reply, 10000);
        return;
    } else {
        await db.delete(`DELETE FROM blacklist WHERE executor = ? AND target = ?`, [message.author.id, id]);
        const reply = await message.reply({
            content: `Member removed from blacklist`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }
}

async function lOpen(message) {
    const existingLobby = await db.getrow(`SELECT id FROM lobby WHERE host = ?`, [message.author.id]);
    const helpChannel = existingLobby ? existingLobby.id : null;
    const helper = await db.getrow(`SELECT * FROM member WHERE id = ?`, [message.author.id]);

    if(!helper || !helper.max_floor) {
        const reply = await message.reply({
            content: `You must give the maximum floor you can reach before opening a lobby. type "max floor 500" (and replace 500 by the max floor you can reach alone).`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    let channel;
    if(helpChannel) {
        // Send a message in the lobby confirming it's open
        channel = await message.guild.channels.fetch(helpChannel);

        const privacy = await db.getval(`SELECT privacy FROM lobby WHERE id = ?`, [channel.id]);
        if(privacy == 1) {
            const reply = await message.reply({
                content: `Your lobby is already opened`
            });
            delayedMessageDelete(reply, 10000);
            return;
        }

        await db.update(`UPDATE lobby SET privacy = 1 WHERE id = ?`, [channel.id]);
    } else {
        // Create the channel
        channel = await message.guild.channels.create({
            name: `${helper.name} lobby`,
            type: ChannelType.GuildText,
            parent: globals.server.channel.bcLobbies
        });
        await channel.permissionOverwrites.edit(message.author.id, {
            ViewChannel: true
        });

        await db.insert(`INSERT INTO lobby (id, max_floor, host, privacy) VALUES (?, ?, ?, 1)`, [channel.id, helper.max_floor, message.author.id]);

        // Send the channel messages
        await channel.send({
            content: `Welcome to <@${message.author.id}>'s lobby.`
        });

        await channel.send({
            content: `Here are the commands you can use here. No need to do a \`/\` before, you type them in chat normally.\n- **id 123** : replace the 123 by your ingame ID\n- **cancel @member** : the @member means you have to ping the member you want to cancel. It will put him back in the help requests pool without changing his floor.\n- **finish @member 1500** : replace @member by pinging the member you finished helping. Replace 1500 by the floor you stopped at.\n- **lobby open** : while make this lobby public until full. People will be able to join.\n- **lobby close** : make this lobby private again.\n- **lobby floor 1550** : increase the max floor you can help people at. Let's say your max floor is 1450 and you're with someone who can get to 1550, do this command to be able to help people above 1450 without changing your personal max floor.\n- **lobby finish 1500** : completely closes the lobby for every member in it.\n- **lobby cancel** : ends a lobby without updating helped members floors`
        });

        const member = await db.getrow(`SELECT * FROM member WHERE id = ?`, [message.author.id]);

        await channel.send({
            content: `<@${member.id}>'s in game ID : ${member.ig_id || "Not given"}`
        });
    }

    // Send a message in bc channel
    const bcChannel = await message.guild.channels.fetch(globals.server.channel.bloodClash);

    const joinButton = new ButtonBuilder()
    .setCustomId(`bcLobby${globals.separator}j${globals.separator}${message.author.id}`)
    .setLabel(`Join lobby`)
    .setStyle(ButtonStyle.Success);

    const closeButton = new ButtonBuilder()
    .setCustomId(`bcLobby${globals.separator}c${globals.separator}${message.author.id}`)
    .setLabel(`Close lobby`)
    .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
    .addComponents(joinButton, closeButton);

    const getLobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [helper.id]);

    const openMessage = await bcChannel.send({
        content: `<@${helper.id}> just opened a lobby. His/her max floor is ${getLobby.max_floor}\n-# <@&${globals.server.role.bcHelp}>`,
        components: [row]
    });

    await db.update(`UPDATE lobby SET message = ? WHERE host = ?`, [openMessage.id, helper.id]);
    

    // Send a message in the lobby confirming it's open
    await channel.send({
        content: `### 🚨 The lobby is now public 🚨`
    });

    // Close lobby explanations
    await channel.send({
        content: `To close the lobby, type "lobby close" or click on the "close" button on the join message in <#${bcChannel.id}>`
    });
}

async function lClose(message) {
    const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [message.author.id]);

    if(!lobby) {
        const reply = await message.reply({
            content: `You don't have any lobby.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await db.update(`UPDATE lobby SET privacy = 0, message = NULL WHERE host = ?`, [message.author.id]);

    await deleteBcMessage(message.guild, lobby.message);

    const lobbyChannel = await message.guild.channels.fetch(lobby.id).catch(() => null);
    if(lobbyChannel) await lobbyChannel.send({
        content : `### 🚨 The lobby is now private 🚨`
    });
}

async function lCancel(message) {
    const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [message.author.id]);

    if(!lobby) {
        const reply = await message.reply({
            content: `You don't have any lobby.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await deleteBcMessage(message.guild, lobby.message);

    await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL WHERE h_id = ?`, [message.author.id]);
    await db.delete(`DELETE FROM lobby WHERE host = ?`, [message.author.id]);

    const channel = await message.guild.channels.fetch(lobby.id).catch(() => null);
    if(channel) await channel.delete();
}

async function lFinish(message) {

    const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [message.author.id]);

    if(!lobby) {
        const reply = await message.reply({
            content: `You don't have any lobby.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 3 || isNaN(split[2])) {
        const reply = await message.reply({
            content: `You must give the floor where you stopped to finish the lobby`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    // Check if floor is above the max floor
    const event = await getBcEventData();
    const maxFloor = event?.maxFloor ?? globals.vars.maxBcFloor;

    if(event && event.maxFloor != null && parseInt(split[2]) > event.maxFloor) {
        const reply = await message.reply({
            content: `You can't close above the max BC floor`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const helping = await db.getall(`SELECT floor, id FROM bc WHERE h_id = ? AND state = 1`, [message.author.id]);

    for(const helped of helping) {
        if(helped.floor > parseInt(split[2])) {
            await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL WHERE id = ?`, [helped.id]);
        } else if(parseInt(split[2]) < maxFloor) {
            await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL, floor = ? WHERE id = ?`, [parseInt(split[2])+1, helped.id]);
        } else {
            // Max floor reached, the request is done
            await db.delete(`DELETE FROM bc WHERE id = ?`, [helped.id]);
        }
    }

    await deleteBcMessage(message.guild, lobby.message);

    await db.delete(`DELETE FROM lobby WHERE host = ?`, [message.author.id]);

    const channel = await message.guild.channels.fetch(lobby.id).catch(() => null);
    if(channel) await channel.delete();
}

async function lFloor(message) {
    const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [message.author.id]);

    if(!lobby) {
        const reply = await message.reply({
            content: `You don't have any lobby.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    const content = message.content.toLowerCase();
    const split = content.split(" ");

    if(split.length != 3 || isNaN(split[2])) {
        const reply = await message.reply({
            content: `You must give the floor you can reach.`
        });
        delayedMessageDelete(reply, 10000);
        return;
    }

    await db.update(`UPDATE lobby SET max_floor = ? WHERE host = ?`, [parseInt(split[2]), message.author.id]);

    const reply = await message.reply({
        content: `max floor updated`
    });
    delayedMessageDelete(reply, 10000);
    return;
}

function defineIfRequest(content) {
    let score = 0;

    // Nettoyage de la ponctuation (on garde les chiffres) et normalisation des espaces
    const cleanContent = content
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?]/g, "") // Supprime la ponctuation
    .replace(/\s+/g, " ") // Normalise les espaces
    .trim();

    if (!cleanContent) return { isRequest: false, score: 0, floor: null };

    const words = cleanContent.split(" ");

    // ==========================================
    // NOUVEAU : EXTRACTION DE L'ÉTAGE (FLOOR)
    // ==========================================
    let detectedFloor = null;

    // Regex explicite :
    // 1. (?:\bfloor\s*|\bf\s*|\bbc\s+) -> cherche "floor" ou "f" (suivi ou non d'un espace), ou "bc" (obligatoirement suivi d'un espace)
    // 2. (\d+) -> capture le numéro de l'étage
    const floorRegex = /(?:\bfloor\s*|\bf\s*|\bbc\s+)(\d+)/;
    const floorMatch = cleanContent.match(floorRegex);

    if (floorMatch) {
        detectedFloor = parseInt(floorMatch[1], 10);
        score += 30; // Bonus automatique si un étage valide est extrait numériquement
    }

    // ==========================================
    // ÉTAPE A : DETECTION DES EXPRESSIONS COMPOSÉES
    // ==========================================
    const compoundExpressions = {
        "need help": 25,
        "help bc": 30,
        "blood clash": 25,
        "bc floor": 35,
        "help floor": 30,
        "bc slot": 25
    };

    // Parcours des expressions fixes
    for (const [expression, points] of Object.entries(compoundExpressions)) {
        if (cleanContent.includes(expression)) {
            score += points;
        }
    }

    // ==========================================
    // ÉTAPE B : DETECTION DES MOTS ISOLÉS
    // ==========================================
    const targetWords = new Set(["help", "bc", "blood", "clash", "bloodclash", "floor"]);
    let matchCount = 0;

    for (const word of words) {
        if (targetWords.has(word)) {
            matchCount++;
            score += 10;
        }
    }

    // ==========================================
    // ÉTAPE C : NORMALISATION SELON LA LONGUEUR & DENSITÉ
    // ==========================================
    const density = matchCount / words.length;
    score = score * (density * 2);

    if (words.length <= 15 && score > 0) {
        score += 20;
    } else if (words.length > 25) {
        score -= 40;
    }

    if (score < 0) score = 0;

    //console.log(`Score: ${score}, Floor: ${detectedFloor}`);

    // Définir le seuil de validation et retourner l'étage
    return { isRequest: score >= 50, score, floor: detectedFloor };
}

async function applySanction(message) {
    const count = await db.getval(`SELECT COUNT(*) FROM bc WHERE r_id = ? AND state = '2'`, [message.author.id]);
    if(!count || count < 3) return;

    switch(count) {
        case 3:
            await message.member.timeout(10 * 60 * 1000); // 10 minutes timeout
            await message.channel.send({
                content: `<@${message.author.id}> requests can only be sent in <#${globals.server.channel.bloodClash}> and you can ask only once a week (can update floors if needed)`
            });
        break;
        case 4:
            await message.member.timeout(60 * 60 * 1000); // 60 minutes timeout
            await message.channel.send({
                content: `<@${message.author.id}> requests can only be sent in <#${globals.server.channel.bloodClash}> and you can ask only once a week (can update floors if needed)`
            });
        break;
        case 5:
            await message.member.roles.add(globals.server.role.restriction); // Adding the ban role
            await message.channel.send({
                content: `<@${message.author.id}> congrats, you broke the rules enough times to receive a permanent community channels ban. You are now only allowed to talk in your village channels and ask for blood clash help anymore.`
            });
        break;
    }
}

async function updateList(guild) {
    // Get data to display
    const requests = await db.getall(`SELECT id, r_id, floor FROM bc WHERE state = 0 ORDER BY floor`);
    const helping = await db.getall(`SELECT id, r_id, h_id FROM bc WHERE state = 1 ORDER BY h_id, floor`);

    // Build the columns, stopping before a column gets too long for an embed field
    const buildColumns = (rows, columns) => {
        const values = columns.map(() => "");
        let hidden = 0;

        for(const row of rows) {
            const lines = columns.map(column => `${column(row)}\n`);
            if(values.some((value, i) => value.length + lines[i].length > 1000)) {
                hidden++;
                continue;
            }
            lines.forEach((line, i) => values[i] += line);
        }

        if(hidden > 0) values[0] += `+${hidden} more`;
        return values.map(value => value || `\t`);
    };

    const [idColumnR, nameColumnR, floorColumnR] = buildColumns(requests, [
        request => `${request.id}.`,
        request => `<@${request.r_id}>`,
        request => `floor ${request.floor}`
    ]);
    const [idColumnH, nameColumnH, helperColumnH] = buildColumns(helping, [
        help => `${help.id}.`,
        help => `<@${help.r_id}>`,
        help => `<@${help.h_id}>`
    ]);

    const embed = new EmbedBuilder()
    .setTitle(`Blood Clash help requests`)
    .addFields(
        { name: `HELP REQUESTS`, value: `\t`, inline: false },
        { name: `Request ID`, value: idColumnR, inline: true },
        { name: `Requester`, value: nameColumnR, inline: true },
        { name: `Starting floor`, value: floorColumnR, inline: true },
        { name: `CURRENTLY HELPED`, value: `\t`, inline: false },
        { name: `Request ID`, value: idColumnH, inline: true },
        { name: `Requester`, value: nameColumnH, inline: true },
        { name: `Helper`, value: helperColumnH, inline: true },
    )
    .setTimestamp();

    // "How to help ?" opens the documentation
    const helpUrl = docs.url(`blood-clash-help`);
    const row = helpUrl ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setLabel(`How to help ?`)
        .setStyle(ButtonStyle.Link)
        .setURL(helpUrl)
    ) : null;

    const payload = {
        embeds: [embed],
        components: row ? [row] : []
    };

    // Delete all the messages in the channel
    const channel = await guild.channels.fetch(globals.server.channel.bcHelp);
    const fetchedMessages = await channel.messages.fetch({ limit: 100 });

    if (fetchedMessages.size == 0) {
        await channel.send(payload);
        return;
    }

    const oldestMessage = fetchedMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).first();

    if (oldestMessage.author.id == guild.client.user.id) {
        await oldestMessage.edit(payload);
    } else {
        await channel.bulkDelete(fetchedMessages, true);
        await channel.send(payload);
    }
}

async function delayedMessageDelete(message, milliseconds) {
    // Wait and delete command and answer
    await new Promise(resolve => setTimeout(resolve, milliseconds));

    // The message (or its channel, like a closed lobby) may already be deleted
    if(message) await message.delete().catch(() => null);
}

export const bc = { filter, applySanction, updateList, getBcEventData }