import { Events } from 'discord.js';

// Executed when bot is ready
export const event = {
    name: Events.GuildMemberAdd,
    async execute(member){

        console.log(member);
        
        const joinMessages = [
            `A new ninja has entered the village. Welcome @<${member.user.id}>`
        ];

        const joinMessage = joinMessages[Math.floor(Math.random() * joinMessages.length)];

        const guild = member.guild;
        const channel = await guild.channels.fetch('1478130659326300355');
        await channel.send(joinMessage);

    }
}