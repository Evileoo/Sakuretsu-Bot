// JS imports
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import { deploy } from './deploy-commands.js';
import dotenv from 'dotenv';
import { client } from "./client.js";
import { exec } from 'child_process';

dotenv.config();

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

// DÉMARRAGE AUTOMATIQUE DE LIBRETRANSLATE
// On utilise exec pour lancer la commande dans votre environnement (ex: venv Python ou installation globale)
// Remplacez 'libretranslate' par le chemin exact de votre exécutable ou commande si vous utilisez un environnement virtuel (ex: './venv/Scripts/libretranslate')
const libreTranslateProcess = exec('libretranslate --port 5000', (error, stdout, stderr) => {
    if (error) {
        console.error(`[LibreTranslate] Erreur lors du lancement de l'instance:`, error);
        return;
    }
});

// Redirection des logs de LibreTranslate vers votre console de développement pour le débogage
libreTranslateProcess.stdout.on('data', (data) => {
    // Optionnel : filtre pour éviter de surcharger votre console une fois qu'il est prêt
    console.log(`[LibreTranslate] ${data.trim()}`);
});

libreTranslateProcess.stderr.on('data', (data) => {
    // LibreTranslate envoie souvent ses logs d'initialisation (Uvicorn, serveurs) dans stderr, ce ne sont pas forcément des crashs
    console.warn(`[LibreTranslate Log] ${data.trim()}`);
});

// Sécurité : S'assurer que le processus LibreTranslate est proprement coupé si le bot Node.js s'arrête
process.on('exit', () => {
    libreTranslateProcess.kill();
});
process.on('SIGINT', () => {
    libreTranslateProcess.kill();
    process.exit(0);
});