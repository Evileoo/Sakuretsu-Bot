import { MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';
import { villageLists } from '../functions/villageLists.js';

// Buttons of the village registration lists: j = join, l = leave, c = close / reopen (Kage and BroKages)
export const button = {
    async execute(interaction, buttonData){

        const action = buttonData[1];
        const answer = async (content) => await interaction.reply({ content: content, flags: MessageFlags.Ephemeral });

        const list = await db.getrow(`SELECT * FROM village_list WHERE id = ?`, [buttonData[2]]);
        if(!list) return await answer(`This list doesn't exist anymore`);

        const member = await db.getrow(`SELECT village_tag FROM member WHERE id = ?`, [interaction.user.id]);
        const inVillage = member?.village_tag == list.village_tag;
        const before = await villageLists.registeredIds(list);

        switch(action) {
            case "j": {
                if(!inVillage) return await answer(`Only the members of the village can join this list`);
                if(list.closed) return await answer(`The registrations are closed`);

                const current = villageLists.position(list, await villageLists.getEntries(list), interaction.user.id);
                if(current) return await answer(current == `registered` ? `You are already registered` : `You are already in the waiting list (position ${current})`);

                try {
                    await db.insert(`INSERT INTO village_list_member (list_id, member_id) VALUES (?, ?)`, [list.id, interaction.user.id]);
                } catch(error) {
                    // Double click: already saved by the first one
                    if(error.code != `ER_DUP_ENTRY`) throw error;
                }

                const entries = await villageLists.refresh(interaction.guild, list, before, { interaction, actorId: interaction.user.id });
                const now = villageLists.position(list, entries, interaction.user.id);
                await interaction.followUp({
                    content: now == `registered` ? `You are registered to **${list.title}**` : `The list is full: you are in the waiting list (position ${now}). You get a place, with a ping, as soon as one frees up`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            case "l": {
                const removed = await db.delete(`DELETE FROM village_list_member WHERE list_id = ? AND member_id = ?`, [list.id, interaction.user.id]);
                if(!removed) return await answer(`You are not in this list`);

                await villageLists.refresh(interaction.guild, list, before, { interaction, actorId: interaction.user.id });
                return;
            }
            case "c": {
                const isRank = interaction.member.roles.cache.has(globals.server.role.sub) || interaction.member.roles.cache.has(globals.server.role.kage);
                if(!inVillage || !isRank) return await answer(`Only the Kage and the BroKages of the village can close or reopen the registrations`);

                list.closed = list.closed ? 0 : 1;
                await db.update(`UPDATE village_list SET closed = ? WHERE id = ?`, [list.closed, list.id]);

                await villageLists.refresh(interaction.guild, list, before, { interaction });
                return;
            }
        }
    }
}
