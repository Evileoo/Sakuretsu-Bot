import { ButtonStyle, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags, ChannelType } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Check if a help request is sent, and in the good channel
async function detector(message) {
    const content = message.content;
    const channel = message.channel;

    if(message.author.bot) {
        return;
    }

    // Check if the message is a help request
    const isHelpRequest = (content.includes("help") || content.includes("need")) && content.includes("bc");
    if(!isHelpRequest) return;

    const ignore = channel.parentId != "1478130471585054893" && channel.parentId != "1509429572830236843";
    const isInAllowedChannel = channel.id == globals.server.channel.bloodClash;
    
    if(ignore) return;

    let block = false;
    if(!isInAllowedChannel) {
        await channel.send({
            content: `<@${message.author.id}>, you can ask for blood clash help only in <#${globals.server.channel.bloodClash}>`
        });
        block = true;
    } else {
        // User mention test
        const pinger = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [message.author.id]);
        
        for(const mention of message.mentions.users) {
            const pinged = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [mention[0]]);

            if(pinger?.village_tag != pinged?.village_tag) {
                await channel.send({
                    content: `<@${message.author.id}>, you cannot ping members outside your village in this channel`
                });
                block = true;
                break;
            }
        }
    }

    if(block == true) {
        await db.insert(`INSERT INTO bc (r_id, tms, is_spam) VALUES (?, CURRENT_DATE(), 1)`, [message.author.id]);
        await message.delete();
        await spamManagement(message)
    } else {
        helpRequest(message);
    }
}

// Check if a member spams
async function spamManagement(message) {
    const requests = await db.getall(`SELECT tms, state, is_spam FROM bc WHERE r_id = ? AND tms >= CURDATE() - INTERVAL 10 HOUR ORDER BY tms DESC`, [message.author.id]);
    
    let spamAmount = 0;
    let openedAmount = 0;

    for(const r of requests) {
        if(r.is_spam == 1) spamAmount++;
        if(r.state == 0) openedAmount++;
    }

    switch(spamAmount) {
        case 3: // Short mute
            await message.member.timeout(5 * 60 * 1000); // 5 minutes timeout
            await message.channel.send({
                content: `<@${message.author.id}>, you can ask for help once every 10 hours\nIn result of the insistance of breaking rules you are doing, you have been muted for 5 minutes.\nThe next mute will last 1 hour`
            });
        break;
        case 4: // Long mute
            await message.member.timeout(60 * 60 * 1000); // 1 hour timeout
            await message.channel.send({
                content: `<@${message.author.id}>, you can ask for help once every 10 hours\nIn result of the insistance of breaking rules you are doing, you have been muted for 1 hour.\nThe next time you will break the rules will result in a permanent ban from community channels`
            });
        break;
        case 5: // Permanent channels ban
            await message.member.roles.add(globals.server.role.restriction); // Adding the ban role
            await message.channel.send({
                content: `<@${message.author.id}> congrats, you broke the rules enough times to receive a permanent community channels ban. You are now only allowed to talk in your village channels.`
            });
        break;
        default:
            if(openedAmount > 0) {
            await message.delete();
            await message.channel.send({
                content: `<@${message.author.id}>, you can ask for help once every 10 hours`
            });
            await db.insert(`INSERT INTO bc (r_id, tms, is_spam) VALUES (?, CURRENT_DATE(), 1)`, [message.author.id]);
        }
    }
}

// Create the request
async function helpRequest(message) {

    // Check syntax
    const splitted = message.content.split(" ");

    if(splitted.length != 4 || splitted[0] != "help" || splitted[1] != "bc" || splitted[2] != "floor" || isNaN(splitted[3])) {
        return await message.channel.send({
            content: `<@${message.author.id}>, the blood clash help message format must be like this: \`help bc floor 500\` (replace the *500* by your starting floor)`
        })
    }

    const member = message.guild.members.cache.get(message.author.id);

    // Insert into database
    const memberData = await db.getrow(`SELECT * FROM member WHERE id = ?`, [message.author.id]);
    const insertedId = await db.insert(`INSERT INTO bc (r_id, r_ig_id, floor, tms, state, is_spam) VALUES (?, ?, ?, NOW(), 0, 0)`, [message.author.id, memberData?.ig_id, parseInt(splitted[3])]);

    // Create and send the message
    await helpMessage(message.channel, insertedId);

    // Confirm message with indicator of next help request time
    await message.reply({
        content: `Your help request has been sent. You will be able to send an other one in 10 hours.`
    });
}

// embed manager
async function helpMessage(channel, bcId) {
    const data = await db.getrow(`SELECT * FROM bc WHERE id = ?`, [bcId]);

    const embed = new EmbedBuilder()
    .setTitle(`Help Request`)
    .setColor(globals.embed.yellow)
    .setTimestamp();

    const row = new ActionRowBuilder();

    if(data.state == 0) { // Not claimed yet
        embed.addFields({ name: `Floor`, value: `${data.floor}`, inline: true });
        embed.addFields({ name: `Member`, value: `<@${data.r_id}>`, inline: true });
        if(data.r_ig_id) embed.addFields({ name: `ID`, value: `${data.r_ig_id}`, inline: true });

        const help = new ButtonBuilder()
        .setCustomId(`bcHelp${globals.separator}${bcId}${globals.separator}help`)
        .setLabel(`Help`)
        .setStyle(ButtonStyle.Success);

        row.addComponents(help);
    } else if(data.state == 1) { // Claimed
        embed.setDescription(`<@${data.h_id}> is helping <@${data.r_id}>.\nStarting from floor ${data.floor}`);

        const cancel = new ButtonBuilder()
        .setCustomId(`bcHelp${globals.separator}${bcId}${globals.separator}cancel`)
        .setLabel(`Cancel`)
        .setStyle(ButtonStyle.Danger);

        const finish = new ButtonBuilder()
        .setCustomId(`bcHelp${globals.separator}${bcId}${globals.separator}finish`)
        .setLabel(`Finished`)
        .setStyle(ButtonStyle.Success);

        row.addComponents(cancel, finish);
    } else { // Finished
        const msg = await channel.messages.fetch(data.msg_req_id);
        return await msg.delete();
    }

    if(data.msg_req_id) {
        const msg = await channel.messages.fetch(data.msg_req_id);
        await msg.edit({
            embeds: [embed],
            components: [row]
        });
    } else {
        const helpChannel = await channel.guild.channels.cache.get(globals.server.channel.bcHelp);
        const msg = await helpChannel.send({
            embeds: [embed],
            components: [row]
        })
        await db.update(`UPDATE bc SET msg_req_id = ?, state = ? WHERE id = ?`, [msg.id, data.state + 1, bcId]);
    }
}

// Accept the request
async function accept(interaction, bcId) {

    const request = await db.getrow(`SELECT * FROM bc WHERE id = ?`, [bcId]);
    const helper = await db.getrow(`SELECT * FROM member WHERE id = ?`, [interaction.user.id]);
    const helped = await db.getrow(`SELECT * from member WHERE id = ?`, [request.r_id]);
    const helperVillage = await db.getrow(`SELECT * from village WHERE tag = ?`, [helper?.village_tag]);
    const helpedVillage = await db.getrow(`SELECT * FROM village where tag = ?`, [helped?.village_tag]);

    if(helper.id == helped.id) {
        return await interaction.reply({
            content: `You can't help yourself`,
            flags: MessageFlags.Ephemeral
        });
    }

    // Controle cluster si renseigné pour les 2
    if(helperVillage && helpedVillage && helperVillage.cluster_id != null && helpedVillage.cluster_id != null && helperVillage.cluster_id != helpedVillage.cluster_id) {
        return await interaction.reply({
            content: `You are not from the same cluster, you can't help him`,
            flags: MessageFlags.Ephemeral
        });
    }
    
    // Gestion role / channel
    let channel;
    if(request.channel_id) {
        channel = await interaction.guild.channels.cache.get(request.channel_id);

        channel.permissionOverwrites.edit(helped.id, {
            ViewChannel: true
        });

        channel.send({
            content: `<@${helped.id} just joined the lobby !>`
        });
    } else {
        channel = await interaction.guild.channels.create({
            name: `lobby-${bcId}`,
            type: ChannelType.GuildText,
            parent: "1533555957009879211"
        });
        channel.permissionOverwrites.edit(helper.id, {
            ViewChannel: true
        });
        channel.permissionOverwrites.edit(helped.id, {
            ViewChannel: true
        });

        // Envoi du guide d'utilisation
        channel.send({
            content: `Welcome to this BC lobby discord channel. <@${helper.id}> <@${helped.id}>\nOnce the lobby gets disbanded, close this lobby by writing \`close lobby\``
        });
    }
    
    // Mise à jour de la base
    await db.update(`UPDATE bc SET state = 1, h_id = ?, channel_id = ? WHERE id = ?`, [interaction.user.id, channel.id, bcId]);

    // Modification du message d'aide
    await helpMessage(interaction.channel, bcId);

    await interaction.deferUpdate();
}

// Cancel the request
async function cancel(interaction, bcId) {
    const request = await db.getrow(`SELECT * FROM bc WHERE id = ?`, [bcId]);

    if(request.h_id != interaction.user.id) {
        await interaction.deferUpdate();
        return;
    }

    // Mise à jour de la base
    const helping = await db.getall(`SELECT channel_id FROM bc WHERE h_id = ? AND state = 1`, [interaction.user.id]);
    await db.update(`UPDATE bc SET state = 0, h_id = NULL, channel_id = NULL WHERE id = ?`, [bcId]);
    // Mise à jour du message d'aide
    await helpMessage(interaction.channel, bcId);
    // Suppression / modification du channel
    const channel = await interaction.guild.channels.cache.get(helping[0].channel_id);
    if(helping.length == 1) {
        await channel.delete();
    } else {
        channel.permissionOverwrites.edit(request.r_id, {
            ViewChannel: false
        });
        await channel.send({
            content: `<@${request.r_id}> help has been cancelled`
        });
    }

    await interaction.deferUpdate();
}

// finish help for someone
async function finish(interaction, bcId) {
    const request = await db.getrow(`SELECT * FROM bc WHERE id = ?`, [bcId]);

    if(request.h_id != interaction.user.id) {
        await interaction.deferUpdate();
        return;
    }

    // Mise à jour de la base
    const helping = await db.getall(`SELECT channel_id FROM bc WHERE h_id = ? AND state = 1`, [interaction.user.id]);
    await db.update(`UPDATE bc SET state = 2 WHERE id = ?`, [bcId]);
    // Mise à jour du message d'aide
    const channel = await interaction.guild.channels.cache.get(helping[0].channel_id);
    if(helping.length == 1) {
        await helpMessage(interaction.channel, bcId);
    } else {
        channel.permissionOverwrites.edit(request.r_id, {
            ViewChannel: false
        });
        await channel.send({
            content: `<@${request.r_id}> help session is done`
        });
    }

    await interaction.deferUpdate();
}

// Delete the lobby
async function endLobby(message) {
    if(message.content == "close lobby" && message.channel.parentId == "1533555957009879211") {
        // Mise à jour de la base
        const helper = await db.getrow(`SELECT h_id FROM bc WHERE (r_id = ? OR h_id = ?) AND state = 1`, [message.author.id, message.author.id]);
        await db.update(`UPDATE bc SET state = 2 WHERE h_id = ? AND state = 1`, [helper.h_id]);
        // Suppression du channel
        const channel = await message.channel;
        await channel.delete();
    }
    
}

// manage village cluster
async function cluster(interaction, id, firstMessage) {
    const member = await db.getrow(`SELECT * FROM member WHERE id = ?`, [interaction.user.id]);
    const village = await db.getrow(`SELECT * FROM village WHERE tag = ?`, [member.village_tag]);
    const cluster = await db.getall(`SELECT * FROM village WHERE cluster_id = ?`, [id]);
    const clusters = await db.getrow(`SELECT DISTINCT COUNT(cluster_id) AS nb FROM village WHERE cluster_id IS NOT NULL`);

    const embed = new EmbedBuilder()
    .setTitle(`Cluster selection`);

    const row = new ActionRowBuilder();

    const previous = new ButtonBuilder()
    .setCustomId(`cluster${globals.separator}list${globals.separator}${id - 1}`)
    .setLabel(`Previous`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(id <= 1);

    const define = new ButtonBuilder()
    .setStyle(ButtonStyle.Success);

    const next = new ButtonBuilder()
    .setCustomId(`cluster${globals.separator}list${globals.separator}${id + 1}`)
    .setLabel(`Next`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(id >= clusters.nb);

    if(cluster.length == 0) {
        embed.setDescription(`If you don't belong to any previous cluster, click on \`Create cluster\``);

        define
        .setCustomId(`cluster${globals.separator}join${globals.separator}${id}`)
        .setLabel(`Create cluster`);
    } else {
        let villages = "";
        for(const v of cluster) {
            villages += `[${v.tag}] ${v.name}\n`
        }

        embed.setDescription(`${villages}\nIf you're in the same blood clash cluster as these villages, click on \`Join cluster\``);

        define
        .setCustomId(`cluster${globals.separator}join${globals.separator}${id}`)
        .setLabel(`Join cluster`);
    }

    row.addComponents(previous, define, next);


    if(firstMessage) {
        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    } else {
        await interaction.update({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }

    
}

export const bloodclash = { detector, helpRequest, accept, cancel, endLobby, finish, endLobby, cluster };