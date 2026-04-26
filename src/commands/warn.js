import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { db } from '../connections/database.js';
import { managementLog } from '../functions/managementLog.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Manage village warns")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Warn a member")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(true)
        )
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("Remove a defined number of warns")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
        .addIntegerOption( (option) =>
            option
            .setName("amount")
            .setDescription("Number of warns")
            .setRequired(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("edit")
        .setDescription("Edit data of a warned member")
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(true)
        )
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(false)
        )
        .addIntegerOption( (option) =>
            option
            .setName("amount")
            .setDescription("Number of warns of the member")
            .setRequired(false)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("list")
        .setDescription("List of warned members")
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("check")
        .setDescription("check if a member received a warning")
        .addStringOption( (option) =>
            option
            .setName("name")
            .setDescription("Member last known name")
            .setRequired(false)
        )
        .addIntegerOption( (option) =>
            option
            .setName("id")
            .setDescription("member ID")
            .setRequired(false)
        )
    )
    , async execute(interaction){

        // Get all command data
        const add = (interaction.options.getSubcommand() != "add") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null
        }

        const remove = (interaction.options.getSubcommand() != "remove") ? null : {
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            amount: (interaction.options.getInteger("amount")) ? interaction.options.getInteger("amount") : 1
        }

        const edit = (interaction.options.getSubcommand() != "edit") ? null : {
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null,
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            amount: (interaction.options.getInteger("amount")) ? interaction.options.getInteger("amount") : null
        }

        const check = (interaction.options.getSubcommand() != "check") ? null : {
            name: (interaction.options.getString("name")) ? interaction.options.getString("name") : null,
            id: (interaction.options.getInteger("id")) ? interaction.options.getInteger("id") : null
        }


        switch(interaction.options.getSubcommand()){
            case "add":
                await addWarn(add, interaction);

                await interaction.reply({
                    content: "member warned",
                    ephemeral: true
                });
            break;
            case "remove":
                await removeWarn(remove, interaction);

                await interaction.reply({
                    content: "warn removed",
                    ephemeral: true
                });
            break;
            case "edit":
                await editWarn(edit);

                await interaction.reply({
                    content: "warn edited",
                    ephemeral: true
                });
            break;
            case "list":
                const warnList = await listWarns();

                // Create discord embed
                const warnedMembers = new EmbedBuilder()
                .setTitle(`Warned members`)
                .setTimestamp()

                let nameList = "";
                let amountList = "";
                let idList = "";

                for(const warn of warnList) {
                    idList += (warn.member_id) ? `${warn.member_id}\n` : `-\n`;
                    nameList += (warn.member_name) ? `${warn.member_name}\n` : `-\n`;
                    amountList += (warn.amount) ? `${warn.amount}\n` : `-\n`;
                }

                warnedMembers.addFields({name: `ID`, value: `${idList}`, inline: true});
                warnedMembers.addFields({name: `Name`, value: `${nameList}`, inline: true});
                warnedMembers.addFields({name: `Amount`, value: `${amountList}`, inline: true});

                await interaction.reply({
                    embeds: [warnedMembers]
                });

            break;
            case "check":
                const member = await checkWarn(check);

                if(member) {
                    await interaction.reply({
                        content: `ID: ${member.member_id} \nName: ${member.member_name} \nNumber of warns: ${member.amount}\nLast warn date: ${member.date}`,
                        ephemeral: true
                    })
                } else {
                    await interaction.reply({
                        content: `Nobody with these parameters has been warned`,
                        ephemeral: true
                    });
                }
            break;
            default:
            break;
        }

        async function addWarn(data, interaction) {
        
            const member = await checkWarn(data);

            if(member) {
                await db.insert('UPDATE warnings SET amount = ?, date = CURDATE() WHERE member_id = ?', [member.amount + 1, data.id]);
            } else {
                await db.insert('INSERT INTO warnings (member_id, member_name, amount, date) VALUES (?, ?, 1, CURDATE())', [data.id, data.name]);
            }

            console.log(interaction.user);

            const message = {
                title: `New warn`,
                author: `${interaction.user.username}`,
                color: 0xeb9a44,
                description: `${data.name} (${data.id}) received a warning`
            };

            await managementLog.sendMessage(message, interaction.client);

        }

        async function removeWarn(data, interaction) {

            const member = await checkWarn(data);

            if(member && (member.amount - data.amount) > 0) {
                await db.insert('UPDATE warnings SET amount = ? WHERE member_id = ?', [member.amount - data.amount, data.id]);
            } else {
                await db.insert('DELETE FROM warnings WHERE member_id = ?', [data.id]);
            }

            const message = {
                title: `Warn removed`,
                author: `${interaction.user.username}`,
                color: 0xeb9a44,
                description: `${data.id} got a warn removed`
            };

            await managementLog.sendMessage(message, interaction.client);
        }

        async function editWarn(data) {
            if(data.name != null) {
                await db.update('UPDATE warnings SET member_name = ? WHERE member_id = ?', [data.name, data.id]);
            }
        
            if(data.amount != null) {
                await db.update('UPDATE warnings SET amount = ? WHERE member_id = ?', [data.amount, data.id]);
            }
        }

        async function listWarns() {
            return await db.getall('SELECT member_id, member_name, amount FROM warnings ORDER BY date DESC');
        }

        async function checkWarn(data) {
            return await db.getrow('SELECT member_id, member_name, amount, date FROM warnings WHERE member_id = ? OR member_name = ?', [data.id, data.name]);
        }
    }
}