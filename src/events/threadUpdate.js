import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ThreadUpdate,
    async execute(oldThread, newThread) {
        await trAlterEvent.threadUpdate(oldThread, newThread);
    }
};
