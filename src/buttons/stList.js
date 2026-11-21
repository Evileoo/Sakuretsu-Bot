import { lists } from '../functions/lists.js';

export const button = {
    async execute(interaction, buttonData){

        const data = {
            action: buttonData[1],
            page: buttonData[2],
            type: buttonData[3] == 'null' ? null : buttonData[3],
            id: buttonData[4] == 'null' ? null : buttonData[4]
        }

        await lists.statusList(interaction, data.page, data.action, data.type, data.id);

    }
}
