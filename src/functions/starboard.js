import { globals } from '../globals.js';

// Messages being forwarded, to avoid forwarding twice when several stars are added at the same time
const processing = new Set();

// Fonction interne qui gère le transfert natif dans le salon starboard
async function starred(message) {
    // 1. Trouver le salon "starboard"
    const starboardChannel = await message.guild.channels.fetch(globals.server.channel.starboard);

    // 2. Transférer directement le message original et faire réagir le bot
    await message.forward(starboardChannel);
    await message.react('⭐');
}

// Fonction principale qui vérifie si le message doit être forward
async function checkStars(reaction) {
    if (reaction.emoji.name !== '⭐') return;
    const message = reaction.message;
    if (!message.guild) return;
    
    if(message.channel.id == globals.server.channel.starboard) return;
    
    if (reaction.count < 5) return;

    // Vérifier si le bot a déjà réagi
    const botReaction = message.reactions.cache.get('⭐');
    if (botReaction && botReaction.me) return;

    // Déclencher le transfert
    if (processing.has(message.id)) return;
    processing.add(message.id);

    try {
        await starred(message);
    } finally {
        processing.delete(message.id);
    }
}

export const starboard = {
    checkStars
};
