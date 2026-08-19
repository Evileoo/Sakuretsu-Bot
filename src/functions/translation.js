import { WebhookClient } from 'discord.js';
import { db } from '../connections/database.js';
import { client } from '../client.js';
import { manageEmojis } from './emojis.js';
import { lt } from '../connections/libretranslate.js';

let tr = [];

async function load() {
    tr = await db.getall(`SELECT * FROM trs_setup ORDER BY guild_id`);
}

async function get() {
    return tr;
}

async function translator(message, main, scd) {
    // convert message
    const noTranslate = await protectLinksObjectsCode(message);
    const htmlFormat = await mdToHtml(noTranslate);

    // translate message
    const translated = await lt.translate(htmlFormat, main, scd);

    // Remove HTML
    return await htmlToMd(translated);
}


async function protectLinksObjectsCode(message) {
    const regexObjets = /(```[\s\S]+?```|`[^`]+`|<@[!&]?\d+>|<#\d+>|<a?:\w+:\d+>|https?:\/\/[^\s]+)/g;
    return message.replace(regexObjets, '<span translate="no">$&</span>');
}

async function mdToHtml(message) {
    return message
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>') // Italic Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')              // Bold
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')                          // Italic
    .replace(/__([^_]+)__/g, '<u>$1</u>')                            // Underline
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')                        // Crossed
    .replace(/\|\|([^`]+)\|\|/g, '<details>$1</details>')            // Spoiler
}

async function htmlToMd(message) {
    return message
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<u>([\s\S]*?)<\/u>/gi, '__$1__')
    .replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<details>([\s\S]*?)<\/details>/gi, '||$1||')
    .replace(/<span[^>]*translate="no"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
}

// Fonction principale réécrite de bout en bout
async function messageManage(message, action) {
    if (message.webhookId && action === "send") return;
    
    // Garde de sécurité : Ignorer immédiatement tous les messages système de Discord
    if (message.system) return;

    if (action === "delete") {
        await handleGlobalDeletion(message);
        return;
    }

    // GESTION ET DÉTECTION DES THREADS
    let targetThreadMappings = null;
    let lookupChannelId = message.channel.id;

    if (message.channel.isThread()) {
        // Si c'est un thread, la configuration globale (tr) est enregistrée sur le salon parent
        lookupChannelId = message.channel.parentId;
        
        // Aller chercher les correspondances des threads miroirs liés en BDD
        const threadRows = await db.getall(
            `SELECT main_thread_id, scd_thread_id FROM trs_threads WHERE guild_id = ? AND (main_thread_id = ? OR scd_thread_id = ?)`,
            [message.guild.id, message.channel.id, message.channel.id]
        );

        if (threadRows && threadRows.length > 0) {
            targetThreadMappings = {};
            for (const r of threadRows) {
                // CORRECTION CRITIQUE : On récupère les salons parents textuels depuis le cache Discord
                // pour indexer les IDs des threads par l'ID de leur salon parent (target.id dans la boucle)
                const mainThreadChannel = message.guild.channels.cache.get(r.main_thread_id);
                const scdThreadChannel = message.guild.channels.cache.get(r.scd_thread_id);
                
                if (mainThreadChannel && scdThreadChannel) {
                    targetThreadMappings[mainThreadChannel.parentId] = r.main_thread_id;
                    targetThreadMappings[scdThreadChannel.parentId] = r.scd_thread_id;
                }
            }
        }
    }

    // Recherche de la configuration avec l'ID du salon textuel approprié (parent ou classique)
    const guildChannels = tr.filter(r => r.guild_id === message.guild.id);
    if (guildChannels.length === 0) return;

    // Déterminer le contexte et collecter les métadonnées des canaux cibles
    // On simule temporairement l'ID si getChannelContext s'appuie strictement sur message.channel.id
    const originalChannelId = message.channel.id;
    if (message.channel.isThread()) message.channel.id = lookupChannelId; 
    
    const context = await getChannelContext(message, action, guildChannels);
    
    // Restauration immédiate de l'ID d'origine après l'analyse du contexte
    if (originalChannelId !== message.channel.id) message.channel.id = originalChannelId;

    if (!context) return;
    const { lng, targetChannels } = context;

    // Préparer le contenu textuel (gestion des émojis globaux)
    const processedContent = await prepareMessageContent(message);

    // Récupérer les correspondances de reply si le message est une réponse
    const replyData = await getReplyContext(message);
    const replyMappings = replyData?.mappings ?? null;
    const originalAuthorId = replyData?.originalAuthorId ?? null;
    const parentContent = replyData?.parentContent ?? "";

    // Traduire et distribuer le message aux canaux cibles
    await distributeMessages(message, action, processedContent, lng, targetChannels, replyMappings, originalAuthorId, parentContent, targetThreadMappings);
}


async function getReplyContext(message) {
    const repliedMsgId = message.reference?.messageId;
    if (!repliedMsgId) return null;

    // 1. Trouver les métadonnées de liaison et l'auteur humain dans la BDD
    const row = await db.getrow(
        `SELECT main_msg, author_id FROM trs_msg WHERE guild_id = ? AND (main_msg = ? OR trs_msg = ?) LIMIT 1`,
        [message.guild.id, repliedMsgId, repliedMsgId]
    );

    const mainMsgId = row?.main_msg;
    if (!mainMsgId) return null;

    // 2. Récupérer toutes les versions associées pour les liens (avec db.getall)
    const rows = await db.getall(
        `SELECT main_id, main_msg, trs_id, trs_msg FROM trs_msg WHERE guild_id = ? AND main_msg = ?`,
        [message.guild.id, mainMsgId]
    );

    // 3. Récupérer le contenu textuel depuis le salon LOCAL actuel (gère les threads)
    let parentContent = "";
    try {
        const localMessage = await message.channel.messages.fetch(repliedMsgId);
        let rawContent = localMessage?.content ?? "";

        if (rawContent.startsWith("↳ *")) {
            const lines = rawContent.split("\n");
            lines.shift(); 
            parentContent = lines.join("\n"); 
        } else {
            parentContent = rawContent;
        }
    } catch (error) {
        console.error("Impossible de récupérer le texte du message local :", error);
    }

    const mappings = {};
    for (const r of rows) {
        // CORRECTION THREAD : Si l'action se passe dans un thread, le mapping doit lier l'ID du thread miroir associé,
        // mais pour l'aiguillage des salons dans distributeMessages, nous conservons le format { channelParentId: messageId }.
        mappings[r.main_id] = r.main_msg;
        mappings[r.trs_id] = r.trs_msg;
    }

    return { 
        mappings, 
        originalAuthorId: row?.author_id ?? null,
        parentContent
    };
}

async function handleGlobalDeletion(message) {
    const row = await db.getrow(
        `SELECT main_msg FROM trs_msg WHERE guild_id = ? AND (main_msg = ? OR trs_msg = ?) LIMIT 1`,
        [message.guild.id, message.id, message.id]
    );

    const mainMsgId = row?.main_msg;
    if (!mainMsgId) return;

    const rows = await db.getall(
        `SELECT main_id, main_msg, trs_id, trs_msg FROM trs_msg WHERE guild_id = ? AND main_msg = ?`,
        [message.guild.id, mainMsgId]
    );

    if (!rows || rows.length === 0) return;

    // DETECTION DES THREADS POUR LA SUPPRESSION
    let targetThreadId = null;
    if (message.channel.isThread()) {
        targetThreadId = message.channel.id;
    }

    const deletedProjectedIds = new Set();

    for (const r of rows) {
        if (!deletedProjectedIds.has(r.main_msg)) {
            // Extraction ou déduction du thread miroir associé si on est dans un contexte de thread
            let currentThreadId = targetThreadId;
            if (targetThreadId) {
                // On cherche l'ID du thread miroir correspondant à ce salon précis
                const threadMatch = await db.getrow(
                    `SELECT main_thread_id, scd_thread_id FROM trs_threads WHERE guild_id = ? AND (main_thread_id = ? OR scd_thread_id = ?) LIMIT 1`,
                    [message.guild.id, targetThreadId, targetThreadId]
                );
                if (threadMatch) {
                    currentThreadId = (r.main_id === message.channel.parentId) ? threadMatch.main_thread_id : threadMatch.scd_thread_id;
                }
            }

            await executeWebhookDelete(r.main_id, r.main_msg, "main", currentThreadId);
            deletedProjectedIds.add(r.main_msg);
        }
        if (!deletedProjectedIds.has(r.trs_msg)) {
            let currentThreadId = targetThreadId;
            if (targetThreadId) {
                const threadMatch = await db.getrow(
                    `SELECT main_thread_id, scd_thread_id FROM trs_threads WHERE guild_id = ? AND (main_thread_id = ? OR scd_thread_id = ?) LIMIT 1`,
                    [message.guild.id, targetThreadId, targetThreadId]
                );
                if (threadMatch) {
                    currentThreadId = (r.trs_id === message.channel.parentId) ? threadMatch.main_thread_id : threadMatch.scd_thread_id;
                }
            }

            await executeWebhookDelete(r.trs_id, r.trs_msg, "scd", currentThreadId);
            deletedProjectedIds.add(r.trs_msg);
        }
    }

    await db.delete(
        `DELETE FROM trs_msg WHERE guild_id = ? AND main_msg = ?`,
        [message.guild.id, mainMsgId]
    );
}

async function executeWebhookDelete(channelId, msgId, type, targetThreadId = null) {
    if (!msgId) return;

    const config = tr.find(r => (type === "main" ? r.main_id : r.scd_id) === channelId);
    const webhookUrl = type === "main" ? config?.main_webhook_url : config?.scd_webhook_url;

    if (!webhookUrl) return;

    const webhookClient = new WebhookClient({ url: webhookUrl });
    
    try {
        // CORRECTION : On passe threadId dans les options pour que le webhook supprime le message au bon endroit
        await webhookClient.deleteMessage(msgId, targetThreadId ? { threadId: targetThreadId } : undefined);
    } catch (error) {
        if (error.code !== 10008) {
            console.error(`Erreur lors de la suppression du message ${msgId}:`, error);
        }
    }
}


// Get channels to translate in
async function getChannelContext(message, action, guildChannels) {
    const mainConfigs = guildChannels.filter(r => r.main_id === message.channel.id);
    const data = [];
    let lng;

    if (mainConfigs.length > 0) {
        lng = mainConfigs[0].main_lng_id;

        for (const c of mainConfigs) {
            const scdMsgId = await db.getrow(
                `SELECT trs_msg FROM trs_msg WHERE guild_id = ? AND trs_id = ? AND main_msg = ?`, 
                [message.guild.id, c.scd_id, message.id]
            );
            data.push({ 
                id: c.scd_id, 
                lng: c.scd_lng_id, 
                msgId: scdMsgId?.trs_msg,
                type: "scd" 
            });
        }
    } else {
        const currentScdConfig = guildChannels.find(r => r.scd_id === message.channel.id);
        if (!currentScdConfig) return null;
        
        lng = currentScdConfig.scd_lng_id;
        let mainMsgId = null;

        if (action !== "send") {
            const row = await db.getrow(
                `SELECT main_msg FROM trs_msg WHERE guild_id = ? AND trs_id = ? AND trs_msg = ?`, 
                [message.guild.id, message.channel.id, message.id]
            );
            mainMsgId = row?.main_msg;
            if (!mainMsgId) return null;
        }

        data.push({
            id: currentScdConfig.main_id,
            lng: currentScdConfig.main_lng_id,
            msgId: mainMsgId,
            type: "main"
        });

        const siblingScdChannels = guildChannels.filter(r => r.main_id === currentScdConfig.main_id);
        for (const c of siblingScdChannels) {
            if (c.scd_id !== message.channel.id) {
                let siblingMsgId = null;
                if (action === "edit" && mainMsgId) {
                    const scdMsgId = await db.getrow(
                        `SELECT trs_msg FROM trs_msg WHERE guild_id = ? AND trs_id = ? AND main_msg = ?`, 
                        [message.guild.id, c.scd_id, mainMsgId]
                    );
                    siblingMsgId = scdMsgId?.trs_msg;
                }
                data.push({
                    id: c.scd_id,
                    lng: c.scd_lng_id,
                    msgId: siblingMsgId,
                    type: "scd_sibling"
                });
            }
        }
    }

    return { lng, targetChannels: data };
}

// 2. TRAITEMENT ET REMPLACEMENT DES ÉMOJIS
async function prepareMessageContent(message) {
    const original = message.content;
    if (!original) return original;

    const emojis = await manageEmojis.extract(message);
    let msgWithEmojis = original;

    for (const emoji of emojis) {
        const applicationEmoji = await manageEmojis.manage(client, emoji);
        const originalEmoji = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
        const replacement = `<${applicationEmoji.animated ? "a" : ""}:${applicationEmoji.name}:${applicationEmoji.id}>`;
        msgWithEmojis = msgWithEmojis.replaceAll(originalEmoji, replacement);
    }

    return msgWithEmojis;
}

async function distributeMessages(message, action, processedContent, sourceLng, targetChannels, replyMappings, originalAuthorId, parentContent, targetThreadMappings) {
    let dynamicMainMsgId = null;

    for (const target of targetChannels) {
        let translatedContent = null;

        if (processedContent) {
            translatedContent = await translator(processedContent, sourceLng, target.lng);
        }

        const targetReplyMsgId = replyMappings ? replyMappings[target.id] : null;

        // CORRECTION CRITIQUE : Sécurisation de l'ID du thread de destination
        let targetThreadId = null;
        if (targetThreadMappings) {
            // On extrait strictement l'ID du thread associé à ce salon cible précis
            targetThreadId = targetThreadMappings[target.id] ?? null;

            // Si on est dans un thread à l'origine mais qu'aucun thread miroir n'a été créé ou trouvé pour ce salon cible,
            // on passe l'exécution pour éviter d'envoyer le message n'importe où ou de faire crash le bot
            if (message.channel.isThread() && !targetThreadId) {
                continue; 
            }
        }

        // Appel sécurisé de la fonction send
        const result = await send(
            message, 
            translatedContent, 
            target.id, 
            action, 
            target.type, 
            target.msgId, 
            dynamicMainMsgId,
            targetReplyMsgId,
            sourceLng,
            target.lng,
            originalAuthorId,
            parentContent,
            targetThreadId // Transmet l'ID nettoyé (String ou null)
        );

        if (result && result.type === "main" && action === "send") {
            dynamicMainMsgId = result.mainMsgId;
        }
    }
}



async function send(message, content, channelId, action, type, msgId, dynamicMainMsgId, targetReplyMsgId, sourceLng, targetLng, originalAuthorId, parentContent, targetThreadId = null) {
    // 1. Récupération de la configuration brute
    const config = tr.find(r => (type === "main" ? r.main_id : r.scd_id) === channelId);
    const webhookUrl = type === "main" ? config?.main_webhook_url : config?.scd_webhook_url;

    if (!webhookUrl) return null;

    const webhookClient = new WebhookClient({ url: webhookUrl });
    let finalContent = content ?? "";

    if (action === "send" && targetReplyMsgId) {
        const actualChannelId = targetThreadId ?? channelId;
        const replyLink = `https://discord.com/channels/${message.guild.id}/${actualChannelId}/${targetReplyMsgId}`;
        
        const authorMention = originalAuthorId ? `<@${originalAuthorId}>` : "l'utilisateur";

        const baseReplyText = "En réponse à"; 
        const translatedReplyText = (sourceLng && targetLng) 
            ? await translator(baseReplyText, sourceLng, targetLng) 
            : baseReplyText;

        let textPreview = "";
        if (parentContent && parentContent.trim().length > 0) {
            const cleanContent = parentContent.replace(/[\r\n]+/g, " "); 
            const truncated = cleanContent.length > 30 ? `${cleanContent.substring(0, 30)}...` : cleanContent;
            
            textPreview = (sourceLng && targetLng) 
                ? await translator(truncated, sourceLng, targetLng) 
                : truncated;
        }

        // CORRECTION : Sécurisation de la déclaration de contentQuote pour éviter le ReferenceError
        const contentQuote = textPreview ? ` : *[${textPreview}](${replyLink})*` : "";
        finalContent = `↳ *[${translatedReplyText}](${replyLink})* ${authorMention}${contentQuote}\n${finalContent}`;
    }

    const allowedMentionsPayload = {};
    if (originalAuthorId) {
        allowedMentionsPayload.users = [originalAuthorId];
    } else {
        allowedMentionsPayload.parse = ["users"];
    }

    const webhookPayload = {
        content: finalContent || undefined, 
        username: message.member?.displayName ?? message.author.globalName ?? message.author.username,
        avatarURL: message.author.displayAvatarURL(),
        embeds: message.embeds,
        files: message.files,
        allowedMentions: allowedMentionsPayload
    };

    // 2. CORRECTION ROUTAGE THREAD : L'option pour discord.js v14 lors de l'appel .send() 
    // doit être passée dans l'objet de payload sous la propriété 'threadId'
    if (targetThreadId) {
        webhookPayload.threadId = targetThreadId;
    }

    if (action === "send") {
        const trsMessage = await webhookClient.send(webhookPayload);
        const mainMsgId = await saveMessageMapping(message, channelId, trsMessage.id, type, dynamicMainMsgId);
        return { type, mainMsgId };
    } 
    
    if (action === "edit") {
        if (!msgId) return null;
        // L'édition requiert également le threadId combiné dans la payload pour les webhooks
        await webhookClient.editMessage(msgId, webhookPayload);
    }

    return null;
}




async function saveMessageMapping(message, channelId, trsMessageId, type, dynamicMainMsgId) {
    let mainId, mainMsgId, trsId, trsMsgId;

    if (type === "scd") {
        mainId = message.channel.id;
        mainMsgId = message.id;
        trsId = channelId;
        trsMsgId = trsMessageId;
    } else if (type === "main") {
        mainId = channelId;
        mainMsgId = trsMessageId;
        trsId = message.channel.id;
        trsMsgId = message.id;
    } else if (type === "scd_sibling") {
        const config = tr.find(r => r.scd_id === channelId);
        mainId = config?.main_id;
        mainMsgId = dynamicMainMsgId; 
        trsId = channelId;
        trsMsgId = trsMessageId;
    }

    if (mainMsgId) {
        // CORRECTION : On enregistre uniquement l'ID du vrai auteur humain
        await db.insert(
            `INSERT INTO trs_msg (main_id, main_msg, trs_id, trs_msg, guild_id, author_id) VALUES (?, ?, ?, ?, ?, ?)`, 
            [
                mainId, 
                mainMsgId, 
                trsId, 
                trsMsgId, 
                message.guild.id, 
                message.author.id
            ]
        );
    }

    return mainMsgId;
}

export const translation = {translator, load, messageManage, get};