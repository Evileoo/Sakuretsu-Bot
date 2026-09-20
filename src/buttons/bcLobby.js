import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            host: buttonData[2]
        }

        if(data.action == "j") {
            const request = await db.getrow(`SELECT * FROM bc WHERE r_id = ?`, [interaction.user.id]);
            const helping = await db.getall(`SELECT * FROM bc WHERE h_id = ?`, [interaction.user.id]);
            const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [data.host]);
            const event = await db.getrow(`SELECT event_data FROM events WHERE event_parent_name = 'Blood Clash' AND CURRENT_TIMESTAMP() >= event_time_start AND CURRENT_TIMESTAMP < event_time_end`);

            if(event) {
                const data = event.event_data.split(globals.separator);
                if(!isNaN(data[1]) && helping.length + 1 == data[1]) {
                    return await interaction.reply({
                        content: `This lobby is full`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            if(helping.length > 0) {
                return await interaction.reply({
                    content: `You are already holding a lobby. You can't join an other.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if(!request) {
                return await interaction.reply({
                    content: `You must have an active help request to join a lobby. Type something like "help bc floor 500", then you will be able to join if the lobby can get high enough`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if(request.h_id != null) {
                return await interaction.reply({
                    content: `You are already being helped`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if(lobby.max_floor <= request.floor) {
                return await interaction.reply({
                    content: `This lobby can not help you reach a higher floor.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            
            const blacklist = await db.getrow(`SELECT 1 FROM blacklist WHERE executor = ? AND target = ?`, [data.host, interaction.user.id]);

            if(blacklist) {
                return await interaction.reply({
                    content: `This helper have blacklisted you. You can't join his lobby.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.update(`UPDATE bc SET h_id = ?, channel_id = ?, state = 1 WHERE id = ?`, [data.host, lobby.id, request.id]);

            const channel = await interaction.guild.channels.cache.get(lobby.id);
            await channel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true
            });
        } else {

            if(interaction.user.id != data.host) {
                return await interaction.reply({
                    content: `Only the host can close the lobby`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const lobby = await db.getrow(`SELECT * FROM lobby WHERE host = ?`, [interaction.user.id]);

            const channel = await interaction.guild.channels.cache.get(lobby.id);
            await channel.send({
                content: `### 🚨 The lobby is now private 🚨`
            });

            await db.update(`UPDATE lobby SET privacy = 0 WHERE host = ?`, [data.host]);
            await interaction.message.delete();
        }
        
    }
}