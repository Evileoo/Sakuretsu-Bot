import { REST, Routes } from 'discord.js';
import fs from 'fs';

// Deploy commands
export const deploy = {
    async refresh(){
        const commands = [];
        
        const commandFiles = (fs.existsSync(`./src/commands`)) ? fs.readdirSync(`./src/commands`).filter(file => file.endsWith(`.js`)) : [];
        const userContextMenuFiles = (fs.existsSync(`./src/userContextMenus`)) ? fs.readdirSync(`./src/userContextMenus`).filter(file => file.endsWith(`.js`)) : [];
        const messageContextMenuFiles = (fs.existsSync(`./src/messageContextMenus`)) ? fs.readdirSync(`./src/messageContextMenus`).filter(file => file.endsWith(`.js`)) : [];
        
        for(const file of commandFiles){
            const command = await import(`./commands/${file}`);
            commands.push(command.command.data.toJSON());
        }
    
        for (const file of userContextMenuFiles) {
            const userContextMenu = await import(`./userContextMenus/${file}`);
            commands.push(userContextMenu.userContextMenu.data.toJSON());
        }
    
        for (const file of messageContextMenuFiles) {
            const messageContextMenu = await import(`./messageContextMenus/${file}`);
            commands.push(messageContextMenu.messageContextMenu.data.toJSON());
        }
    
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        
        try{
            console.log(`Refreshing ${commands.length} applications (/) commands.`);
        
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID),
                { body: commands }
            );
        
            console.log(`Successfully loaded ${data.length} applications (/) commands.`);
        } catch(err){
            console.error(err);
        }
    }
}