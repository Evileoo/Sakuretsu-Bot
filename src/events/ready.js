import { Events } from 'discord.js';
import schedule from 'node-schedule';
import { ingame } from '../functions/ingame.js';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client){
        // Bot is ready message
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Bot activity
        schedule.scheduleJob("activity", '0 0 0-23 * * *', async function() {

            const activities = [
                "Gathering resources",
                "Fighting Akatsuki",
                "Saving Konoha",
                "Spending my wage into the game",
                "Spending all my nephies in the auction",
                "Looking for the next event",
                "Awakening Sasuke",
                "Trying to learn mokuton",
                "Waiting for Obito to be added to the game",
                "Waiting for Might Guy to be added to the game",
                "Waiting for Shisui to be added to the game",
                "Feeding the beasts",
                "Counting demon tails",
                "Bidding as anonymous"
            ];

            const activity = Math.floor(Math.random() * activities.length);

            client.user.setActivity(activities[activity]);
        });

        client.user.setStatus("online");

        // Load the ingame event panel
        ingame.eventPanel(client);
    }
}