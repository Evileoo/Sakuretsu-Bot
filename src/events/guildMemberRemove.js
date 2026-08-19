import { Events } from 'discord.js';
import { globals } from '../globals.js';

// Executed when bot is ready
export const event = {
    name: Events.GuildMemberRemove,
    async execute(member){

        const name = member.displayName ?? member.user.username;
        
        const leaveMessages = [
            `${name} left his village`,
            `${name} died in the ninja war`,
            `${name} got killed be the Akatsuki`,
            `looks like ${name} stopped the game`,
            `I farted, and ${name} died from it`,
            `${name} fell brutally, ouch`,
            `${name}'s game crashed`,
            `${name} ran out of battery`
        ];

        const leaveMessage = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];

        const guild = member.guild;
        const channel = await guild.channels.fetch(`${globals.server.channel.flow}`);
        await channel.send(leaveMessage);

    }
}