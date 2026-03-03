// JS imports
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import { deploy } from './deploy-commands.js';
import dotenv from 'dotenv';

dotenv.config();

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// Create commands collection
client.commands = new Collection();
const commands = (fs.existsSync(`./src/commands`)) ? fs.readdirSync(`./src/commands`).filter(file => file.endsWith(`.js`)) : [];
for(let command of commands){
    const commandFile = await import(`./commands/${command}`);
    client.commands.set(commandFile.command.data.name, commandFile.command);
}

// Create user context menus collection
client.userContextMenus = new Collection();
const userContextMenus = (fs.existsSync(`./src/userContextMenus`)) ? fs.readdirSync(`./src/userContextMenus`).filter(file => file.endsWith(`.js`)) : [];
for(let userContextMenu of userContextMenus){
    const userContextMenuFile = await import(`./userContextMenus/${userContextMenu}`);
    client.userContextMenus.set(userContextMenuFile.userContextMenu.data.name, userContextMenuFile.userContextMenu);
}

// Create message context menus collection
client.messageContextMenus = new Collection();
const messageContextMenus = (fs.existsSync(`./src/messageContextMenus`)) ? fs.readdirSync(`./src/messageContextMenus`).filter(file => file.endsWith(`.js`)) : [];
for(let messageContextMenu of messageContextMenus){
    const messageContextMenuFile = await import(`./messageContextMenus/${messageContextMenu}`);
    client.messageContextMenus.set(messageContextMenuFile.messageContextMenu.data.name, messageContextMenuFile.messageContextMenu);
}

// Create buttons collection
client.buttons = new Collection();
const buttons = (fs.existsSync(`./src/buttons`)) ? fs.readdirSync(`./src/buttons`).filter(file => file.endsWith(`.js`)) : [];
for(let button of buttons){
    const buttonFile = await import(`./buttons/${button}`);
    client.buttons.set(button.split(".")[0], buttonFile.button);
}

// Create modals collection
client.modals = new Collection();
const modals = (fs.existsSync(`./src/modals`)) ? fs.readdirSync(`./src/modals`).filter(file => file.endsWith(`.js`)) : [];
for(let modal of modals){
    const modalFile = await import(`./modals/${modal}`);
    client.modals.set(modal.split(".")[0], modalFile.modal);
}

// Create autocompletes collection
client.autocompletes = new Collection();
const autocompletes = (fs.existsSync(`./src/autocompletes`)) ? fs.readdirSync(`./src/autocompletes`).filter(file => file.endsWith(`.js`)) : [];
for(let autocomplete of autocompletes){
    const autocompleteFile = await import(`./autocompletes/${autocomplete}`);
    client.autocompletes.set(autocomplete.split(".")[0], autocompleteFile.autocomplete);
}

// Create select menus collection
client.selectMenus = new Collection();
const selectMenus = (fs.existsSync(`./src/selectMenus`)) ? fs.readdirSync(`./src/selectMenus`).filter(file => file.endsWith(`.js`)) : [];
for(let selectMenu of selectMenus){
    const selectMenuFile = await import(`./selectMenus/${selectMenu}`);
    client.selectMenus.set(selectMenu.split(".")[0], selectMenuFile.selectMenu);
}

// Read events
const events = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
for(let event of events){
    const eventFile = await import(`./events/${event}`);
    if(eventFile.event.once){
        client.once(eventFile.event.name, (...args) => {
            eventFile.event.execute(...args);
        });
    } else {
        client.on(eventFile.event.name, (...args) => {
            eventFile.event.execute(...args);
        });
    }
}

deploy.refresh();


// Handle possible errors to prevent the bot to shut down when an error occurs
client.on('error', (error) => {
    console.error('Erreur détectée:', error);
});

client.on('shardError', (error) => {
    console.error('Erreur de Shard:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rejection non gérée à:', promise, 'raison:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Exception non gérée:', error);
    process.exit(1); // Restart the bot if necessary
});

client.on('disconnect', () => {
    console.warn('Le bot a été déconnecté.');
});

client.on('reconnecting', () => {
    console.info('Le bot se reconnecte...');
});

// Login
await client.login(process.env.TOKEN);