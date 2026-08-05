import { Events } from 'discord.js';
import schedule from 'node-schedule';
import { db } from '../connections/database.js';
import { mb } from '../functions/missionBoard.js';
import { nameUpdates } from '../functions/nameUpdates.js';
import { translation } from '../functions/translation.js';
import { manageEmojis } from '../functions/emojis.js';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client){

        // Testing database connection
        try{
            const checkConnection = await db.query(`SELECT 1 FROM DUAL`);
            
            if(checkConnection.length > 0){
                console.log(`Database Connected`);
            }
        } catch(error){
            console.error(`Couldn't connected to database`);
            console.error(error);
        }

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
                "Waiting for Might Guy to be added to the game",
                "Waiting for Shisui to be added to the game",
                "Feeding the beasts",
                "Counting demon tails",
                "Bidding as anonymous",
                "Waiting for tri-army clash",
                "Kicking AFK members from the village",
                "Cheering Leo for his work"
            ];

            const activity = Math.floor(Math.random() * activities.length);

            client.user.setActivity(activities[activity]);
        });

        client.user.setStatus("online");

        // Load the mission board panel
        //mb.missionBoard(client);

        // Load name update routine
        nameUpdates.updateRoutine(client);

        // Load translation links
        translation.load();

        //Load emojis
        manageEmojis.getBotEmojis(client);
    }
}