import { Events } from 'discord.js';
import schedule from 'node-schedule';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client){
        // Bot is ready message
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // On change l'activité toutes les heures
        schedule.scheduleJob("activity", '0 0 0-23 * * *', async function() {

            const activities = [
                "Gathering resources",
                "Fighting Akatsuki",
                "Saving Konoha",
                "Spending my wage into the game",
                "Spending all my nephies in the auction",
                "Looking for the next event"
            ];

            const activity = Math.floor(Math.random() * activities.length);

            client.user.setActivity(activities[activity]);
        });

        client.user.setStatus("online");

        // TODO boucle pour récupérer les datas des membres (faire une fonction)
    }
}