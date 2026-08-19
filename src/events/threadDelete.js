import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ThreadDelete,
    async execute(thread) {
        await trAlterEvent.threadDelete(thread);
    }
};
