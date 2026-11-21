import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { bc } from '../functions/bloodclash.js';

export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            host: buttonData[2]
        }

        const answer = async (content) => {
            return await interaction.reply({
                content: content,
                flags: MessageFlags.Ephemeral
            });
        };

        const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [data.host]);

        if(!lobby) {
            await interaction.message.delete().catch(() => null);
            return await answer(`This lobby doesn't exist anymore`);
        }

        if(data.action == "j") {
            const request = await db.getrow(`SELECT * FROM bc WHERE r_id = ? AND state <> 2`, [interaction.user.id]);
            const hosting = await db.getrow(`SELECT 1 FROM lobby WHERE host = ?`, [interaction.user.id]);
            const event = await bc.getBcEventData();

            if(lobby.privacy != 1) {
                return await answer(`This lobby is private`);
            }

            if(hosting || interaction.user.id == data.host) {
                return await answer(`You are already holding a lobby. You can't join an other.`);
            }

            if(event && event.lobbySize != null) {
                const lobbyMembers = await db.getval(`SELECT COUNT(*) FROM bc WHERE h_id = ? AND state = 1`, [data.host]);
                if(lobbyMembers >= event.lobbySize) {
                    return await answer(`This lobby is full`);
                }
            }

            if(!request) {
                return await answer(`You must have an active help request to join a lobby. Type something like "help bc floor 500", then you will be able to join if the lobby can get high enough`);
            }

            if(request.h_id != null || request.state == 1) {
                return await answer(`You are already being helped`);
            }

            if(parseInt(lobby.max_floor) <= request.floor) {
                return await answer(`This lobby can not help you reach a higher floor.`);
            }

            const blacklist = await db.getrow(`SELECT 1 FROM blacklist WHERE executor = ? AND target = ?`, [data.host, interaction.user.id]);

            if(blacklist) {
                return await answer(`This helper have blacklisted you. You can't join his lobby.`);
            }

            const channel = await interaction.guild.channels.fetch(lobby.id).catch(() => null);
            if(!channel) {
                return await answer(`This lobby doesn't exist anymore`);
            }

            await db.update(`UPDATE bc SET h_id = ?, channel_id = ?, state = 1 WHERE id = ?`, [data.host, lobby.id, request.id]);

            await channel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true
            });

            const member = await db.getrow(`SELECT ig_id FROM member WHERE id = ?`, [interaction.user.id]);
            await channel.send({
                content: `<@${interaction.user.id}> joined the lobby. His in game ID is ${member?.ig_id ?? "not given"}`
            });

            await answer(`You joined the lobby, head to <#${channel.id}>`);

            await bc.updateList(interaction.guild);
        } else {

            if(interaction.user.id != data.host) {
                return await answer(`Only the host can close the lobby`);
            }

            await interaction.deferUpdate();

            await db.update(`UPDATE lobby SET privacy = 0, message = NULL WHERE host = ?`, [data.host]);

            const channel = await interaction.guild.channels.fetch(lobby.id).catch(() => null);
            if(channel) await channel.send({
                content: `### 🚨 The lobby is now private 🚨`
            });

            await interaction.message.delete().catch(() => null);
        }

    }
}
