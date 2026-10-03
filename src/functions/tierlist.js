import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../connections/database.js';
import { globals } from '../globals.js';

async function getTierlistText(type) {
    const data = await defineTiers(type);
    const totalLists = data.tierlists || 1;

    const flatNinjasList = [];
    for (const ninja of Object.values(data.scores)) {
        if (ninja.score > 0) {
            flatNinjasList.push({ displayName: `${ninja.long || ninja.short}\n`, avgScore: ninja.score / totalLists });
        }
        if (ninja.score_t2 > 0) {
            flatNinjasList.push({ displayName: `${ninja.long || ninja.short} T2\n`, avgScore: ninja.score_t2 / totalLists });
        }
        if (ninja.score_t5 > 0) {
            flatNinjasList.push({ displayName: `${ninja.long || ninja.short} T5\n`, avgScore: ninja.score_t5 / totalLists });
        }
    }

    // Tri décroissant par score moyen
    flatNinjasList.sort((a, b) => b.avgScore - a.avgScore);

    const displayTiers = {
        'G Tier\n': [], 'S Tier\n': [], 'A Tier\n': [], 'B Tier\n': [], 'C Tier\n': [], 'D Tier\n': []
    };

    for (const ninja of flatNinjasList) {
        if (ninja.avgScore >= 61) displayTiers['G Tier\n'].push(ninja.displayName);
        else if (ninja.avgScore >= 51) displayTiers['S Tier\n'].push(ninja.displayName);
        else if (ninja.avgScore >= 41) displayTiers['A Tier\n'].push(ninja.displayName);
        else if (ninja.avgScore >= 31) displayTiers['B Tier\n'].push(ninja.displayName);
        else if (ninja.avgScore >= 21) displayTiers['C Tier\n'].push(ninja.displayName);
        else if (ninja.avgScore >= 11) displayTiers['D Tier\n'].push(ninja.displayName);
    }

    // Formatage du texte pour l'embed (ex: **S** : Naruto, Sasuke)
    // On utilise un retour à la ligne pour que la colonne reste compacte verticalement
    let text = "";
    for (const [tierName, ninjas] of Object.entries(displayTiers)) {
        if (ninjas.length > 0) {
            text += `**__${tierName}__** ${ninjas.join('')}\n`;
        }
    }

    return {
        text: text || "*No ninja in this tier yet*",
        count: data.tierlists
    };
}

// Update the tierlist message
async function tierlistMessage(channel) {
    const messages = await channel.messages.fetch({ limit: 1 });
    const firstMessage = messages.first();

    // Récupération des données pour les 3 types en parallèle
    const [globalData, pveData, pvpData] = await Promise.all([
        getTierlistText(0), // Global
        getTierlistText(1), // PvE
        getTierlistText(2)  // PvP
    ]);

    // Construction de l'Embed unique à 3 colonnes
    const embed = new EmbedBuilder()
        .setTitle(`Community Ninja Ranking`)
        .setColor(globals.embed.white)
        .setDescription("Ninjas ranking, made by the community")
        .addFields(
            { name: "🌍 Global", value: globalData.text, inline: true },
            { name: "⚔️ PvE", value: pveData.text, inline: true },
            { name: "🏆 PvP", value: pvpData.text, inline: true }
        )
        .setFooter({ 
            text: `Tierlists : Global (${globalData.count}) | PvE (${pveData.count}) | PvP (${pvpData.count})` 
        })
        .setTimestamp();

    // Envoi ou mise à jour du message
    if (firstMessage && firstMessage.author.id === channel.client.user.id) { 
        await firstMessage.edit({ embeds: [embed] });
    } else { 
        await channel.send({ embeds: [embed] });
    }
}

// Update the personal tierlist
async function updatePersonalTierlist(interaction, modalData) {
    const memberId = interaction.user.id;
    const type = modalData[1]; // Type (0 global, 1 PvE, 2 PvP)

    const modal = {
        g_tier: interaction.fields.getTextInputValue("gTierInput"),
        s_tier: interaction.fields.getTextInputValue("sTierInput"),
        a_tier: interaction.fields.getTextInputValue("aTierInput"),
        b_tier: interaction.fields.getTextInputValue("bTierInput"),
        c_tier: interaction.fields.getTextInputValue("cTierInput")
    };

    const ninjas = await db.getall(`SELECT short, \`long\` FROM ninjas`);

    const cleanedTiers = { g_tier: [], s_tier: [], a_tier: [], b_tier: [], c_tier: [] };
    const invalidLines = [];

    // Analyser chaque champ textuel reçu du modal
    for (const [tierKey, rawText] of Object.entries(modal)) {
        if (!rawText) continue;

        // Découpage par ligne et nettoyage
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

        for (const line of lines) {
            // Isoler le suffixe potentiel T2 ou T5
            const parts = line.split(' ');
            let suffix = null;
            if (parts.length > 1 && ['T2', 'T5'].includes(parts[parts.length - 1])) {
                suffix = parts.pop();
            }
            const ninjaName = parts.join(' ').trim();

            const matchedNinja = ninjas.find(n => 
                (n.short && n.short.toLowerCase() === ninjaName.toLowerCase()) || 
                (n.long && n.long.toLowerCase() === ninjaName.toLowerCase())
            );

            if (matchedNinja) {
                // Si le ninja est reconnu, on reconstruit sa ligne proprement (avec sa bonne casse BDD)
                const standardizedName = matchedNinja.long || matchedNinja.short;
                const finalLine = suffix ? `${standardizedName} ${suffix}` : standardizedName;
                cleanedTiers[tierKey].push(finalLine);
            } else {
                // Si le ninja n'est pas reconnu, on garde la ligne originale pour la signaler
                invalidLines.push(line);
            }
        }
    }

    // Préparation des chaînes de caractères à enregistrer dans la BDD (jointure par retour à la ligne)
    const gText = cleanedTiers.g_tier.join('\n');
    const sText = cleanedTiers.s_tier.join('\n');
    const aText = cleanedTiers.a_tier.join('\n');
    const bText = cleanedTiers.b_tier.join('\n');
    const cText = cleanedTiers.c_tier.join('\n');

    const tierlist = await db.getrow(`SELECT 1 FROM tierlist WHERE id = ? AND type = ?`, [memberId, type]);

    if(tierlist) {
        await db.update(
            `UPDATE tierlist SET g_tier = ?, s_tier = ?, a_tier = ?, b_tier = ?, c_tier = ? WHERE id = ? AND type = ?`,
            [gText, sText, aText, bText, cText, memberId, type]
        );
    } else {
        await db.insert(
            `INSERT INTO tierlist (id, type, g_tier, s_tier, a_tier, b_tier, c_tier) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [memberId, type, gText, sText, aText, bText, cText]
        );
    }

    // Retourner le résultat à la commande appelante
    if(invalidLines.length > 0) {
        await interaction.reply({
            content: `These ninjas aren't recognized by the bot. They have been ignored.\n${invalidLines.toString()}`,
            flags: MessageFlags.Ephemeral
        });
    } else {
        await interaction.reply({
            content: `Tierlist received`,
            flags: MessageFlags.Ephemeral
        });
    }

    await tierlistMessage(interaction.channel);
    
}


async function defineTiers(type) {
    const tierlists = await db.getall(`SELECT * FROM tierlist WHERE type = ?`, [type]);
    const ninjasList = await db.getall(`SELECT short, \`long\` FROM ninjas`);

    const tierConfig = {
        g_tier: { min: 65, max: 90 },
        s_tier: { min: 51, max: 60 },
        a_tier: { min: 41, max: 50 },
        b_tier: { min: 31, max: 40 },
        c_tier: { min: 21, max: 30 },
        d_tier: { min: 11, max: 20 }
    };

    const globalScores = {};
    for (const ninja of ninjasList) {
        globalScores[ninja.short] = {
            short: ninja.short,
            long: ninja.long,
            score: 0,
            score_t2: 0,
            score_t5: 0,
            count: 0
        };
    }

    for (const row of tierlists) {
        for (const [columnName, config] of Object.entries(tierConfig)) {
            const rawText = row[columnName];
            if (!rawText) continue;

            const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
            const totalNinjasInTier = lines.length;
            if (totalNinjasInTier === 0) continue;

            let scoresForThisTier = [];
            if (columnName === 'g_tier') {
                scoresForThisTier = Array(totalNinjasInTier).fill(tierConfig.g_tier.max);
            } else {
                const step = (config.max - config.min) / (totalNinjasInTier + 1);
                for (let i = 1; i <= totalNinjasInTier; i++) {
                    // MODIFICATION ICI : .unshift() au lieu de .push() pour mettre les plus gros scores au début du tableau 
                    // Ainsi, le premier ninja de la liste aura le score le plus proche de config.max
                    scoresForThisTier.unshift(Number((config.min + step * i).toFixed(2)));
                }
            }

            lines.forEach((line, index) => {
                const assignedScore = scoresForThisTier[index];
                const parts = line.split(' ');
                let suffix = null;
                if (parts.length > 1 && ['T2', 'T5'].includes(parts[parts.length - 1])) {
                    suffix = parts.pop();
                }
                const ninjaName = parts.join(' ').trim();

                const matchedNinja = ninjasList.find(n => n.short === ninjaName || n.long === ninjaName);

                if (matchedNinja) {
                    const key = matchedNinja.short;
                    if (suffix === 'T2') {
                        globalScores[key].score_t2 += assignedScore;
                    } else if (suffix === 'T5') {
                        globalScores[key].score_t5 += assignedScore;
                    } else {
                        globalScores[key].score += assignedScore;
                    }
                    globalScores[key].count += 1;
                }
            });
        }
    }

    return {
        tierlists: tierlists.length,
        scores: globalScores
    };
}


export const tierlist = {
    tierlistMessage,
    updatePersonalTierlist
};
