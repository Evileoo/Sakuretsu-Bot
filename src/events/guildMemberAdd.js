import { Events } from 'discord.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const event = {
    name: Events.GuildMemberAdd,
    async execute(member){
        
        const joinMessages = [
            `A new ninja has entered the village. Welcome <@${member.user.id}>`
        ];

        const joinMessage = joinMessages[Math.floor(Math.random() * joinMessages.length)];

        const guild = member.guild;
        const channel = await guild.channels.fetch(`${globals.server.channel.flow}`);
        await channel.send(joinMessage);

        await member.roles.add(globals.server.role.lone);

    }
}