import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        const data = {
            choice: buttonData[1],
            channelId: buttonData[2],
            messageId: buttonData[3]
        }

        if(data.choice == "y") {
            // try because the message could've been deleted
            try {
                const channel = await interaction.guild.channels.cache.get(data.channelId);
                const message = await channel.messages.fetch(data.messageId);

                await db.insert(`INSERT INTO bc (r_id, state) VALUES (?, ?)`, [message.author.id, 2]);

                await message.reply({
                    content: `Help requests are not allowed in this channel. Please ask in <#${globals.server.channel.bloodClash}>.\nConsecutive requests outside <#${globals.server.channel.bloodClash}> channel will lead to a mute.`
                });

                await message.delete();
            } catch(e) {}
        }
        await interaction.message.delete();
    }
}