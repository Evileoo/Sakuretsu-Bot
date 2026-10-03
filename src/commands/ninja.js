import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, ButtonBuilder, ActionRowBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("ninja")
    .setDescription("Ninja commands")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("get")
        .setDescription("Get ninja data")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the ninja, pick it up from the list")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit ninja data")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the ninja, pick it up from the list")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption( (option) =>
            option
            .setName("type")
            .setDescription("The type of data to edit")
            .setRequired(true)
            .addChoices(
                { name: `Global data`, value: `g` },
                { name: `Skills`, value: `s` },
                { name: `Awakens`, value: `a` },
            )
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add a ninja")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Name of the ninja")
            .setRequired(true)
            .setMaxLength(50)
        )
        .addStringOption( (option) =>
            option
            .setName("short")
            .setDescription("Shortened name")
            .setRequired(true)
            .setMaxLength(5)
        )
    )
    , async execute(interaction){

        // Get all command data
        const params = {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            type: (interaction.options.getString("type")) ? interaction.options.getString("type") : null,
            short: (interaction.options.getString("short")) ? interaction.options.getString("short") : null
        }

        switch(interaction.options.getSubcommand()){
            case "get":
                await getNinjaData(params, interaction);
            break;
            case "edit":
                await editNinjaData(params, interaction);
            break;
            case "add":
                await addNinja(params, interaction);
            break;
            default:
            break;
        }


        async function getNinjaData(ninja, interaction) {
            const data = await db.getrow(`SELECT * FROM ninjas WHERE \`short\` = ?`, [ninja.name]);

            // If no data is found
            if(!data) {
                return await interaction.reply({
                    content: `Unkown ninja`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create ninja data embed
            const embed = new EmbedBuilder()
            .setTitle(`${data.long}'s data`)
            .addFields(
                { name: `Global data`, value: `- **Rarity :** ${data.rarity}\n- **Element :** ${data.element}\n- **Class :** ${data.class}\n- **Damage Type :** ${data.dmg_type}`, inline: false },
                { name: `${data.skill1.split("\n\n")[0]}`, value: `${data.skill1.split("\n\n")[1]}`, inline: true },
                { name: `Upgrades`, value: `${data.skill1.split("\n\n")[2]}`, inline: true },
                { name: `\t`, value: `\t`, inline: false },
                { name: `${data.skill2.split("\n\n")[0]}`, value: `${data.skill2.split("\n\n")[1]}`, inline: true },
                { name: `Upgrades`, value: `${data.skill2.split("\n\n")[2]}`, inline: true },
                { name: `\t`, value: `\t`, inline: false },
                { name: `${data.skill3.split("\n\n")[0]}`, value: `${data.skill3.split("\n\n")[1]}`, inline: true },
                { name: `Upgrades`, value: `${data.skill3.split("\n\n")[2]}`, inline: true },
                { name: `\t`, value: `\t`, inline: false },
                { name: `${data.skill4.split("\n\n")[0]}`, value: `${data.skill4.split("\n\n")[1]}`, inline: true },
                { name: `Upgrades`, value: `${data.skill4.split("\n\n")[2]}`, inline: true },
                { name: `\t`, value: `\t`, inline: false },
                { name: `Awaken T2`, value: `${data.awakenT2}`, inline: true },
                { name: `Awaken T5`, value: `${data.awakenT5}`, inline: true },

            );

            switch(data.element.toLowerCase()) {
                case "fire":
                    embed.setColor(globals.embed.orange);
                break;
                case "lightning":
                    embed.setColor(globals.embed.cyan);
                break;
                case "wind":
                    embed.setColor(globals.embed.green);
                break;
                case "water":
                    embed.setColor(globals.embed.blue);
                break;
                case "yin":
                    embed.setColor(globals.embed.yellow);
                break;
                case "yang":
                    embed.setColor(globals.embed.purple);
                break;
                default:
                    embed.setColor(globals.embed.white);
                break;
            }

            if(data.effect_list) {
                const button = new ButtonBuilder()
                .setCustomId(`ninjaEffects${globals.separator}${data.short}`)
                .setLabel(`Effects list`)

                const row = new ActionRowBuilder()
                .addComponents(button)

                return await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                return await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        async function editNinjaData(params, interaction) {
            // Get ninja data
            const ninja = await db.getrow(`SELECT * FROM ninjas WHERE \`short\` = ?`, [params.name]);

            const modal = new ModalBuilder()
            .setCustomId(`editNinja${globals.separator}${params.type}`);

            if(params.type == "g") {
                modal.setTitle(`Edit global ninja data`);

                const rarity = new TextInputBuilder()
                .setCustomId(`rarity`)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50)
                .setRequired(true)
                .setValue((ninja?.rarity) ? ninja.rarity : " ");

                const rarityLabel = new LabelBuilder()
                .setLabel(`Rarity`)
                .setDescription(`Rarity of the ninja`)
                .setTextInputComponent(rarity);

                const element = new TextInputBuilder()
                .setCustomId(`element`)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(30)
                .setRequired(true)
                .setValue((ninja?.element) ? ninja.element : " ");

                const elementLabel = new LabelBuilder()
                .setLabel(`Element`)
                .setDescription(`Element of the ninja`)
                .setTextInputComponent(element);

                const classs = new TextInputBuilder()
                .setCustomId(`class`)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50)
                .setRequired(true)
                .setValue((ninja?.class) ? ninja.class : " ");

                const classLabel = new LabelBuilder()
                .setLabel(`Class`)
                .setDescription(`Class of the ninja`)
                .setTextInputComponent(classs);

                const dmgType = new TextInputBuilder()
                .setCustomId(`dmgType`)
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50)
                .setRequired(true)
                .setValue((ninja?.dmg_type) ? ninja.dmg_type : " ");

                const dmgTypeLabel = new LabelBuilder()
                .setLabel(`Damage Type`)
                .setDescription(`Damage type of the ninja`)
                .setTextInputComponent(dmgType);

                modal.addLabelComponents(rarityLabel, elementLabel, classLabel, dmgTypeLabel);

            } else if(params.type == "s") {
                modal.setTitle(`Edit ninja skills`);

                const skill1 = new TextInputBuilder()
                .setCustomId(`skill1`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1024)
                .setRequired(true)
                .setValue((ninja?.skill1) ? ninja.skill1 : " ");

                const skill1Label = new LabelBuilder()
                .setLabel(`Skill 1`)
                .setDescription(`First skill of the ninja`)
                .setTextInputComponent(skill1);

                const skill2 = new TextInputBuilder()
                .setCustomId(`skill2`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(2000)
                .setRequired(true)
                .setValue((ninja?.skill2) ? ninja.skill2 : " ");

                const skill2Label = new LabelBuilder()
                .setLabel(`Skill 2`)
                .setDescription(`Second skill of the ninja`)
                .setTextInputComponent(skill2);

                const skill3 = new TextInputBuilder()
                .setCustomId(`skill3`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(2000)
                .setRequired(true)
                .setValue((ninja?.skill3) ? ninja.skill3 : " ");

                const skill3Label = new LabelBuilder()
                .setLabel(`Skill 3`)
                .setDescription(`Third skill of the ninja`)
                .setTextInputComponent(skill3);

                const skill4 = new TextInputBuilder()
                .setCustomId(`skill4`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(2000)
                .setRequired(true)
                .setValue((ninja?.skill4) ? ninja.skill4 : " ");

                const skill4Label = new LabelBuilder()
                .setLabel(`Skill 4`)
                .setDescription(`Fourth skill of the ninja`)
                .setTextInputComponent(skill4);

                modal.addLabelComponents(skill1Label, skill2Label, skill3Label, skill4Label);
            } else {
                modal.setTitle(`Edit ninja awakens`);

                const awakenT2 = new TextInputBuilder()
                .setCustomId(`awakenT2`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1000)
                .setRequired(true)
                .setValue((ninja?.awakenT2) ? ninja.awakenT2 : " ");

                const awakenT2Label = new LabelBuilder()
                .setLabel(`Awaken T2`)
                .setDescription(`Awaken T2 bonus`)
                .setTextInputComponent(awakenT2);

                const awakenT5 = new TextInputBuilder()
                .setCustomId(`awakenT5`)
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1000)
                .setRequired(true)
                .setValue((ninja?.awakenT5) ? ninja.awakenT5 : " ");

                const awakenT5Label = new LabelBuilder()
                .setLabel(`Awaken T5`)
                .setDescription(`Awaken T5 bonus`)
                .setTextInputComponent(awakenT5);

                modal.addLabelComponents(awakenT2Label, awakenT5Label);
            }

            await interaction.showModal(modal);
        }

        async function addNinja(params, interaction) {
            const check = await db.getrow(`SELECT DESTINCT element FROM ninjas WHERE \`short\` = ? OR \`long\` = ?`, [params.short, params.name]);
        
            if(check) {
                return await interaction.reply({
                    content: `This ninja already exists. Be sure his long and short name is unique.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await db.insert(`INSERT INTO ninjas (\`short\`, \`long\`) VALUES (?, ?)`, [params.short, params.name]);

            return await interaction.reply({
                content: `Ninja added. You can edit the data with \`/ninja edit\``,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}