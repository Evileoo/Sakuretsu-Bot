import { Events } from 'discord.js';
import { trAlterEvent } from '../functions/trAlterEvent.js';

export const event = {
    name: Events.ThreadCreate,
    async execute(thread, newlyCreated) {
        await trAlterEvent.threadCreate(thread, newlyCreated);
    }
};
