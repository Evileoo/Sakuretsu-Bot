import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

const columns = {
    i: `flow_incoming`,
    l: `flow_leave`,
    w: `flow_warn`,
    b: `flow_ban`,
    s: `flow_promote`
};

export const button = {
    async execute(interaction, buttonData){

        const data = {
            event: buttonData[1],
            status: buttonData[2]
        }

        // The panel is in the village moderation channel
        const village = await db.getrow(`SELECT tag FROM village WHERE moderation = ?`, [interaction.channelId]);

        if(!village || !columns[data.event]) {
            return await interaction.reply({
                content: `This panel isn't linked to a village anymore`,
                flags: MessageFlags.Ephemeral
            });
        }

        const newStatus = data.status == 0 ? 1 : 0;

        await db.update(`UPDATE village SET ${columns[data.event]} = ? WHERE tag = ?`, [newStatus, village.tag]);

        const flows = await db.getrow(`SELECT flow_incoming, flow_leave, flow_warn, flow_ban, flow_promote FROM village WHERE tag = ?`, [village.tag]);

        const flowButton = (event, label) => new ButtonBuilder()
        .setCustomId(`vflow${globals.separator}${event}${globals.separator}${flows[columns[event]]}`)
        .setLabel(label)
        .setStyle(flows[columns[event]] == 0 ? ButtonStyle.Success : ButtonStyle.Danger);

        const row = new ActionRowBuilder()
        .addComponents(
            flowButton(`i`, `New member`),
            flowButton(`l`, `Member leave`),
            flowButton(`w`, `Member warned`),
            flowButton(`b`, `Member banned`),
            flowButton(`s`, `Member promoted/demoted`)
        );

        await interaction.update({
            components: [row]
        });

    }
}
