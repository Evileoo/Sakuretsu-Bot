import { Events, MessageFlags } from 'discord.js';
import { globals } from '../globals.js';

export const event = {
    name: Events.InteractionCreate,
    async execute(interaction){
		// Check interaction type
        if (interaction.isChatInputCommand()){
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if (interaction.isButton()) {

			const buttonData = interaction.customId.split(globals.separator);
			
			const button = interaction.client.buttons.get(buttonData[0]);

			if(!button) console.error(`No button matching ${interaction.commandName} was found.`);

			try {
				await button.execute(interaction, buttonData);
			} catch(error) {
				console.error(`Error executing ${interaction.customId}`);
				console.error(error);
			}

		} else if (interaction.isStringSelectMenu()) {

			const selectMenuData = interaction.customId.split(globals.separator);

			const selectMenu = interaction.client.selectMenus.get(selectMenuData[0]);

			if(!selectMenu) console.error(`No select menu matching ${selectMenuData[0]} was found.`);

			try {
				await selectMenu.execute(interaction, selectMenuData);
			} catch(error) {
				console.error(`Error executing ${interaction.customId}`);
				console.error(error);
			}

		} else if (interaction.isAutocomplete()) {

			let autocomplete;
			if(interaction.options._subcommand == 'example'){
			} else {
				console.error(`No autocomplete matching ${interaction.commandName} / ${interaction.options._subcommand} was found.`);
				return;
			}

			try {
				await autocomplete.execute(interaction);
			} catch(error) {
				console.error(`Error executing ${interaction.options._subcommand}`);
				console.error(error);
			}
			
		} else if(interaction.isModalSubmit()) {

			const modalData = interaction.customId.split(globals.separator);

			const modal = interaction.client.modals.get(modalData[0]);

			if(!modal) console.error(`No modal matching ${interaction.modalData[0]} was found.`);

			try {
				await modal.execute(interaction, modalData);
			} catch(error) {
				console.error(`Error executing ${interaction.customId}`);
				console.error(error);
			}
		} else if(interaction.isUserContextMenuCommand()) {
			const userContextMenu = interaction.client.userContextMenus.get(interaction.commandName);

			if (!userContextMenu) {
				console.error(`No userContextMenu matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await userContextMenu.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if(interaction.isMessageContextMenuCommand()) {
			const messageContextMenu = interaction.client.messageContextMenus.get(interaction.commandName);

			if (!messageContextMenu) {
				console.error(`No messageContextMenu matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await messageContextMenu.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else {
			interaction.reply({
				content: `I don't know what you did, but this message isn't supposed to be shown`,
				flags: MessageFlags.Ephemeral
			});

			console.error(interaction);

			return;
		}
    }
}