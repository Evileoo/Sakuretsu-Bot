import { EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            id: buttonData[2],
            tag: buttonData[3]
        }

        if(interaction.user.id == data.id) {
            const channel = await interaction.guild.channels.cache.get(interaction.message.channelId);
            const message = await channel.messages.fetch(interaction.message.id);

            if(data.action == "d") {
                message.delete();

                return await interaction.reply({
                    content: `You denied the invitation`,
                    flags: MessageFlags.Ephemeral
                });
            }
            // Checks
            const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
            
            if(!member) {
                await db.insert(`INSERT INTO member (id, name) VALUES (?, ?)`, [interaction.user.id, interaction.member.displayName ?? interaction.user.username]);
            }

            if(member.village_tag) {
                message.delete();

                if(member.village_tag == "    ") {
                    return await interaction.reply({
                        content: `You already have an application to a village`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    return await interaction.reply({
                        content: `You are in a village. You can't join an other`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            await interaction.deferUpdate();

            // Remove lone role
            const lone = await interaction.guild.roles.cache.get(globals.server.role.lone);
            await interaction.member.roles.remove(lone);

            // Add village role
            const village = await db.getrow(`SELECT role_id, name, flow FROM village WHERE tag = ?`, [data.tag]);
            const villageRole = await interaction.guild.roles.cache.get(village.role_id);
            await interaction.member.roles.add(villageRole);

            // Update database
            await db.update(`UPDATE member SET village_tag = ? WHERE id = ?`, [data.tag, interaction.user.id]);

            // Update message
            await message.edit({
                content: `<@${interaction.user.id}> has joined **[${data.tag}] ${village.name}**`,
                components: []
            });

            // Send message in village flow
            const flowEmbed = await new EmbedBuilder()
            .setTitle(`New member`)
            .setDescription(`<@${interaction.user.id}> has joined the village !`)
            .setColor(globals.embed.green)
            .setTimestamp();

            const flowChannel = await interaction.guild.channels.cache.get(village.flow);
            flowChannel.send({
                embeds: [flowEmbed]
            });

        } else {
            return await interaction.reply({
                content: `Only <@${data.id}> can interact with these buttons`,
                flags: MessageFlags.Ephemeral
            });
        }

    }
}