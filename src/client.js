import { Client, GatewayIntentBits, Partials } from "discord.js";
import { globals } from "./globals.js";

export const client = new Client({
    // In test mode, roles (and @everyone / @here) are never pinged by the bot
    ...(globals.testMode ? { allowedMentions: { parse: ["users"], repliedUser: true } } : {}),
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.ThreadMember,
        Partials.GuildMember,
        Partials.User
    ]
});
