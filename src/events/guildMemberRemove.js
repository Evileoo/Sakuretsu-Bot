import { Events } from 'discord.js';

// Executed when bot is ready
export const event = {
    name: Events.GuildMemberRemove,
    async execute(member){

        const name = member.displayName ?? member.user.username;
        
        const leaveMessages = [
            `${name} has left the village`
        ];

        const leaveMessage = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];

        const guild = member.guild;
        const channel = await guild.channels.fetch(`${globals.server.channel.flow}`);
        await channel.send(leaveMessage);

    }
}