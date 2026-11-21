import { Events } from 'discord.js';
import { globals } from '../globals.js';
import { db } from '../connections/database.js';
import { nameUpdates } from '../functions/nameUpdates.js';

// Executed when bot is ready
export const event = {
    name: Events.GuildMemberAdd,
    async execute(member){
        
        const joinMessages = [
            `<@${member.user.id}> is looking for a village`,
            `<@${member.user.id}> just used Mokuton, WTF ??`,
            `I've heard <@${member.user.id}> was a great ninja, let's see that`,
            `The expert of Taijutsu, <@${member.user.id}> just released the 7th gate`,
            `<@${member.user.id}> finished the genin exam successfully`,
            `<@${member.user.id}> just casted a kinjutsu ?`,
            `<@${member.user.id}> finished to learn flying raijin`,
            `<@${member.user.id}> casted a massive rasengan !`,
            `<@${member.user.id}> just awakened his rasengan`,
            `<@${member.user.id}> has a jogan ??`,
            `<@${member.user.id}> dreams to become Kage, let's see if he can make it`,
            `A new jinchuriki appeared, welcome <@${member.user.id}>`
        ];

        const joinMessage = joinMessages[Math.floor(Math.random() * joinMessages.length)];

        const guild = member.guild;
        const channel = await guild.channels.fetch(`${globals.server.channel.flow}`);
        await channel.send(joinMessage);

        const memberData = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [member.user.id]);

        const village = (memberData && memberData.village_tag != null)
            ? await db.getrow(`SELECT role_id FROM village WHERE tag = ?`, [memberData.village_tag])
            : null;

        if(village) {
            // The member comes back in his village
            await member.roles.add(village.role_id);
        } else {
            if(memberData && memberData.village_tag != null) {
                // The village doesn't exist anymore
                await db.update(`UPDATE member SET village_tag = NULL WHERE id = ?`, [member.user.id]);
            }
            await member.roles.add(globals.server.role.lone);
        }

        // Discord resets the nickname when a member leaves, give him back his name
        await nameUpdates.updateName(member.user.id, guild);
    }
}