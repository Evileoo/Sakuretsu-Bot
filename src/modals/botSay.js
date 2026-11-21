import { botSay } from '../functions/botSay.js';

// Message written in the "/say" or "Reply as bot" box
export const modal = {
    async execute(interaction, modalData){

        if(!botSay.isAllowed(interaction)) return await botSay.refuse(interaction);

        await botSay.send(interaction, modalData[1], modalData[2]);
    }
}
