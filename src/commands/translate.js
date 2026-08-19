import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, WebhookClient, ChannelType, flatten } from 'discord.js';
import { db } from '../connections/database.js';
import { translation } from '../functions/translation.js';
import { lt } from '../connections/libretranslate.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translation functionnalities")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add a language to translate in")
        .addChannelOption( (option) => 
            option
            .setName(`category`)
            .setDescription(`category to copy`)
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("main")
            .setDescription("language of the category you want to translate from")
            .addChoices(
                { name: `English - English`, value: `en` },
                { name: `Français - French`, value: `fr` },
                { name: `Deutsch - German`, value: `de` },
                { name: `हिंदी - Hindi`, value: `hi` },
                { name: `Indonesia - Indonesian`, value: `id` },
                { name: `Italiano - Italian`, value: `it` },
                { name: `Português - Portuguese`, value: `pt` },
                { name: `Русский - Russian`, value: `ru` },
                { name: `Español - Spanish`, value: `es` },
                { name: `Tiếng Việt - Vietnamese`, value: `vi` },
            )
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("scd")
            .setDescription("language of category you want to translate to")
            .addChoices(
                { name: `English - English`, value: `en` },
                { name: `Français - French`, value: `fr` },
                { name: `Deutsch - German`, value: `de` },
                { name: `हिंदी - Hindi`, value: `hi` },
                { name: `Indonesia - Indonesian`, value: `id` },
                { name: `Italiano - Italian`, value: `it` },
                { name: `Português - Portuguese`, value: `pt` },
                { name: `Русский - Russian`, value: `ru` },
                { name: `Español - Spanish`, value: `es` },
                { name: `Tiếng Việt - Vietnamese`, value: `vi` },
            )
            .setRequired(true)
        )
        .addRoleOption( (option) =>
            option
            .setName("role")
            .setDescription("Role needed to access to the translated category")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("Remove a translated category")
        .addChannelOption( (option) => 
            option
            .setName(`category`)
            .setDescription(`category to remove`)
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    , async execute(interaction){

        // Get all command data
        const data = {
            main: (interaction.options.getString("main")) ? interaction.options.getString("main") : null,
            scd: (interaction.options.getString("scd")) ? interaction.options.getString("scd") : null,
            role: (interaction.options.getRole("role")) ? interaction.options.getRole("role") : null,
            category: (interaction.options.getChannel("category")) ? interaction.options.getChannel("category") : null
        }

        switch(interaction.options.getSubcommand()){
            case "add":
                await addLanguage(data, interaction);
            break;
            case "remove":
                await removeLanguage(data, interaction);
            break;
            default:
            break;
        }


        async function addLanguage(data, interaction) {
            // check si la category n'est pas secondaire
            const checkScd = await db.getrow(`SELECT DISTINCT main_pid FROM trs_setup WHERE scd_pid = ? AND guild_id = ?`, [data.category.id, interaction.guild.id]);
            if(checkScd) {
                return await interaction.reply({
                    content: `You can't put a secondary category as main category`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.reply({
                content: "ok",
                flags: MessageFlags.Ephemeral
            });

            // traduire le nom de la catégorie
            const tCatName = await lt.translate(data.category.name, data.main, data.scd);

            // Créer la nouvelle category
            const tCategory = await interaction.guild.channels.create({
                name: `${tCatName}`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: await interaction.guild.roles.cache.find(r => r.name === '@everyone'),
                        deny: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    },
                    {
                        id: data.role.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    }
                ]
            });

            // Récupération des channels
            const channels = data.category.children.cache.sort((a, b) => a.position - b.position);

            // crée une copie de la catégorie en traduisant tous les noms de channels
            for(const channel of channels) {
                // traduire le nom
                const tChannelName = await lt.translate(channel[1].name, data.main, data.scd);
                // créer le channel
                const tChannel = await channel[1].clone({
                    parent: tCategory.id,
                    name: tChannelName,
                    permissionOverwrites: [
                        {
                            id: await interaction.guild.roles.cache.find(r => r.name === '@everyone'),
                            deny: [
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        },
                        {
                            id: data.role.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        }
                    ]
                });

                // Créer les webhooks
                let mainW, scdW;
                if(channel[1].isTextBased()) {
                    // Check if the main channel already has a webhook
                    const checkWebhook = await db.getrow(`SELECT DISTINCT main_webhook_url FROM trs_setup WHERE guild_id = ? AND main_id = ?`, [interaction.guild.id, channel[1].id]);
                    
                    // Create if needed
                    if(!checkWebhook || checkWebhook.main_webhook_url == null) {
                        const webhook = await channel[1].createWebhook({
                            name: "Translator",
                            avatar: interaction.client.user.displayAvatarURL()
                        });
                        mainW = webhook.url
                    } else {
                        mainW = checkWebhook.main_webhook_url;
                    }

                    // Create the scd webhook
                    const tWebhook = await tChannel.createWebhook({
                        name: "Translator",
                        avatar: interaction.client.user.displayAvatarURL()
                    });

                    scdW = tWebhook.url
                }

                
                // ajouter dans la base
                await db.insert(`INSERT INTO trs_setup (main_id, main_pid, scd_id, scd_pid, main_lng_id, scd_lng_id, role_id, guild_id, main_webhook_url, scd_webhook_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    channel[1].id,
                    channel[1].parentId,
                    tChannel.id,
                    tChannel.parentId,
                    data.main,
                    data.scd,
                    data.role.id,
                    interaction.guild.id,
                    mainW,
                    scdW
                ]);
            }

            await translation.load();
        }

        async function removeLanguage(data, interaction) {
            // check si la catégorie est secondaire
            const checkScd = await db.getrow(`SELECT DISTINCT main_pid FROM trs_setup WHERE scd_pid = ? AND guild_id = ?`, [data.category.id, interaction.guild.id]);
            if(!checkScd) {
                return await interaction.reply({
                    content: `You can't remove a non-secondary category`,
                    flags: MessageFlags.Ephemeral
                });
            }
            
            await interaction.reply({
                content: "ok",
                flags: MessageFlags.Ephemeral
            });

            const channels = data.category.children.cache;

            for(const channel of channels) {
                const main = await db.getrow(`SELECT DISTINCT main_id FROM trs_msg WHERE trs_id = ? AND guild_id = ?`, [channel[1].id, interaction.guild.id]);
                await db.delete(`DELETE FROM trs_msg WHERE trs_id = ? AND guild_id = ?`, [channel[1].id, interaction.guild.id]);
                await channel[1].delete();

                const webhook = await db.getrow(`SELECT main_webhook_url FROM trs_setup WHERE main_id = ? AND guild_id = ?`, [channel[1].id, interaction.guild.id]);
                const webhookAmount = await db.getrow(`SELECT COUNT(*) AS amt FROM trs_setup WHERE main_webhook_url = ?`, [webhook?.main_webhook_url]);
                if(webhookAmount.amt == 1) {
                    const dscWebhook = await interaction.client.fetchWebhook(webhook.main_webhook_url);
                    if(dscWebhook) await dscWebhook.delete();
                }
            }

            await db.delete(`DELETE FROM trs_setup WHERE scd_pid = ? AND guild_id = ?`, [data.category.id, interaction.guild.id])

            await data.category.delete();


            await translation.load();
        }
    }
}