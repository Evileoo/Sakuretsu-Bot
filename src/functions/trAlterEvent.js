import { WebhookClient } from 'discord.js';
import { db } from '../connections/database.js';
import { client } from '../client.js';
import { manageEmojis } from './emojis.js';
import { translation } from './translation.js'; 


async function getTargetWebhooks(channel, type) {
    // tr doit être accessible globalement ou importé
    const guildChannels = (await translation.get()).filter(r => r.guild_id === channel.guild.id);
    const targets = [];

    if (type === "main") {
        // Le canal modifié est un MAIN, on cherche ses SCD correspondants
        const configs = guildChannels.filter(r => r.main_id === channel.id);
        for (const c of configs) {
            if (c.scd_webhook_url) targets.push({ channelId: c.scd_id, url: c.scd_webhook_url });
        }
    } else {
        // Le canal modifié est un SCD, on cherche son MAIN et ses frères SCD
        const currentConfig = guildChannels.find(r => r.scd_id === channel.id);
        if (currentConfig) {
            if (currentConfig.main_webhook_url) {
                targets.push({ channelId: currentConfig.main_id, url: currentConfig.main_webhook_url });
            }
            const siblings = guildChannels.filter(r => r.main_id === currentConfig.main_id && r.scd_id !== channel.id);
            for (const s of siblings) {
                if (s.scd_webhook_url) targets.push({ channelId: s.scd_id, url: s.scd_webhook_url });
            }
        }
    }
    return targets;
}

async function determineChannelType(channel) {
    const isMain = (await translation.get()).some(r => r.guild_id === channel.guild.id && r.main_id === channel.id);
    return isMain ? "main" : "scd";
}

async function channelCreate(channel) {
    // On ne gère que les salons textuels créés dans une catégorie sur un serveur
    if (!channel.guild || !channel.parentId || channel.type !== 0) return;

    const isInMain = await db.getrow(`SELECT DISTINCT 1 FROM trs_setup WHERE main_pid = ?`, [channel.parentId]);
    if (!isInMain) return;

    try {
        const fetchedLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: 10 // correspond à ActionType.ChannelCreate
        });
        
        const firstEntry = fetchedLogs.entries.first();
        
        // Si l'entrée de log correspond bien à ce salon et que l'auteur est notre bot, on ignore
        if (firstEntry && firstEntry.target?.id === channel.id && firstEntry.executor?.id === client.user.id) {
            return; 
        }
    } catch (auditError) {
        // Sécurité de secours basée sur la BDD
        const currentTr = await translation.get();
        if (currentTr.some(r => r.scd_id === channel.id)) return;
    }

    // 1. Récupérer toutes les lignes liées à cette catégorie principale
    const rawConfigs = (await translation.get()).filter(r => r.main_pid === channel.parentId);
    if (rawConfigs.length === 0) return;

    // Éliminer les doublons de catégories secondaires
    const categoryConfigs = [];
    const seenScdPids = new Set();
    
    for (const config of rawConfigs) {
        if (!seenScdPids.has(config.scd_pid)) {
            seenScdPids.add(config.scd_pid);
            categoryConfigs.push(config);
        }
    }

    // On récupère la langue de la catégorie principale
    const mainLngId = categoryConfigs[0].main_lng_id;

    // On crée le Webhook du salon principal une seule fois
    const mainWebhook = await channel.createWebhook({ name: "Translation Bot" });

    // 2. Créer le salon miroir uniquement dans CHAQUE catégorie secondaire UNIQUE
    for (const config of categoryConfigs) {
        try {
            const scdChannel = await channel.clone({
                parent: config.scd_pid,
                reason: "Création automatique du salon miroir de traduction"
            });

            // Création du Webhook sur le nouveau salon secondaire
            const scdWebhook = await scdChannel.createWebhook({ name: "Translation Bot" });

            // Récupération de l'ID du rôle
            const role = await db.getrow(`SELECT DISTINCT role_id FROM trs_setup WHERE scd_pid = ?`, [scdChannel.parentId]);

            // L'insertion SQL
            await db.insert(`INSERT INTO trs_setup(guild_id, main_id, main_lng_id, main_webhook_url, scd_id, scd_lng_id, scd_webhook_url, main_pid, scd_pid, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                channel.guild.id,
                channel.id,
                mainLngId,
                mainWebhook.url,
                scdChannel.id,
                config.scd_lng_id,
                scdWebhook.url,
                channel.parentId,
                config.scd_pid,
                role?.role_id ?? null
            ]);

            await translation.load();
            
        } catch (error) {
            console.error(`Erreur lors du clone ou de la configuration du salon miroir pour ${channel.name}:`, error);
        }
    }
}

async function channelDelete(channel) {
    if (!channel.guild) return;

    // 1. Chercher si le salon supprimé faisait partie de votre réseau de traduction
    // On vérifie s'il s'agissait d'un salon principal (main_id) ou secondaire (scd_id)
    const configRow = await db.getrow(
        `SELECT main_id, scd_id FROM trs_setup WHERE guild_id = ? AND (main_id = ? OR scd_id = ?) LIMIT 1`,
        [channel.guild.id, channel.id, channel.id]
    );

    if (!configRow) return; // Ce salon n'était pas un salon de traduction géré

    // 2. Récupérer TOUS les salons liés à cette liaison (le principal et tous les secondaires associés)
    const relatedChannels = await db.getall(
        `SELECT main_id, scd_id FROM trs_setup WHERE guild_id = ? AND main_id = ?`,
        [channel.guild.id, configRow.main_id]
    );

    // Collecter les IDs uniques des salons à supprimer sur Discord (sans dupliquer le main)
    const channelIdsToDelete = new Set();
    for (const r of relatedChannels) {
        channelIdsToDelete.add(r.main_id);
        channelIdsToDelete.add(r.scd_id);
    }

    // Retirer le salon qui vient déjà d'être supprimé par l'utilisateur pour éviter une erreur 404
    channelIdsToDelete.delete(channel.id);

    // 3. Supprimer les salons miroirs restants sur Discord
    for (const targetId of channelIdsToDelete) {
        try {
            const targetChannel = await channel.guild.channels.cache.get(targetId);
            if (targetChannel) {
                await targetChannel.delete("Suppression automatique par le système de salons miroirs");
            }
        } catch (error) {
            // Ignore l'erreur si le salon a déjà été supprimé manuellement par un autre modérateur simultanément
            if (error.code !== 10003) { 
                console.error(`Impossible de supprimer le salon miroir ${targetId}:`, error);
            }
        }
    }

    // 4. Nettoyer la base de données de configuration pour cette liaison de salons
    await db.delete(
        `DELETE FROM trs_setup WHERE guild_id = ? AND main_id = ?`,
        [channel.guild.id, configRow.main_id]
    );

    // Nettoyer également l'historique des messages liés à ces salons pour libérer de l'espace
    await db.delete(
        `DELETE FROM trs_msg WHERE guild_id = ? AND main_id = ?`,
        [channel.guild.id, configRow.main_id]
    );

    await translation.load();
}

async function channelUpdate(oldChannel, newChannel) {
    // On ne gère que les salons textuels au sein d'un serveur
    if (!newChannel.guild || newChannel.type !== 0) return;

    // 1. Chercher si le salon modifié est un salon principal (MAIN)
    // 'tr' correspond à votre table de configuration globale
    const mainConfigs = (await translation.get()).filter(r => r.main_id === newChannel.id);
    if (mainConfigs.length === 0) return; // Ce n'est pas un salon principal géré

    // 2. Parcourir chaque salon secondaire lié pour appliquer les changements
    for (const config of mainConfigs) {
        try {
            const scdChannel = await newChannel.guild.channels.cache.get(config.scd_id);
            if (!scdChannel) continue;

            // Préparation des modifications à appliquer
            const updatePayload = {};

            // Synchronisation et traduction automatique du NOM du salon si modifié
            if (oldChannel.name !== newChannel.name) {
                // On traduit le nouveau nom du salon depuis la langue source (MAIN) vers la langue cible (SCD)
                const translatedName = await translation.translator(newChannel.name, config.main_lng_id, config.scd_lng_id);
                
                // Formatage Discord pour les salons textuels (minuscules, pas d'espaces ni de caractères spéciaux complexes)
                updatePayload.name = translatedName
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "") // Supprime les caractères interdits
                    .replace(/\s+/g, "-");        // Remplace les espaces par des tirets
            }

            // Synchronisation et traduction automatique du SUJET (Topic) si modifié
            if (oldChannel.topic !== newChannel.topic && newChannel.topic) {
                updatePayload.topic = await translation.translator(newChannel.topic, config.main_lng_id, config.scd_lng_id);
            } else if (oldChannel.topic !== newChannel.topic && !newChannel.topic) {
                updatePayload.topic = null; // Si le sujet a été vidé
            }

            // Synchronisation brute des propriétés techniques (NSFW, Slowmode, Position)
            if (oldChannel.nsfw !== newChannel.nsfw) {
                updatePayload.nsfw = newChannel.nsfw;
            }
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                updatePayload.rateLimitPerUser = newChannel.rateLimitPerUser;
            }
            if (oldChannel.position !== newChannel.position) {
                updatePayload.position = newChannel.position;
            }

            // 3. Appliquer les modifications sur le salon secondaire si des changements ont été détectés
            if (Object.keys(updatePayload).length > 0) {
                await scdChannel.edit(updatePayload);
            }

        } catch (error) {
            console.error(`Impossible de mettre à jour le salon miroir secondaire ${config.scd_id}:`, error);
        }
    }
}

async function threadCreate(thread, newlyCreated) {
    // On ne gère que les threads nouvellement créés sur un serveur
    if (!newlyCreated || !thread.guild || !thread.parentId) return;

    // 1. Vérifier si le salon parent du thread est un salon principal (MAIN)
    const mainConfigs = (await translation.get()).filter(r => r.main_id === thread.parentId);
    if (mainConfigs.length === 0) return; // Ce n'est pas un salon principal géré

    // 2. Parcourir chaque salon secondaire pour y cloner le Thread
    for (const config of mainConfigs) {
        try {
            const scdChannel = await thread.guild.channels.cache.get(config.scd_id);
            if (!scdChannel) continue;

            // Création du thread miroir dans le salon secondaire
            const scdThread = await scdChannel.threads.create({
                name: thread.name,
                autoArchiveDuration: thread.autoArchiveDuration,
                type: thread.type, // Préserve le type (public ou privé)
                reason: "Création automatique par le système de salons miroirs"
            });

            // 3. Enregistrer l'association des deux Threads en BDD
            await db.insert(
                `INSERT INTO trs_threads (guild_id, main_thread_id, scd_thread_id) VALUES (?, ?, ?)`,
                [thread.guild.id, thread.id, scdThread.id]
            );

        } catch (error) {
            console.error(`Impossible de créer le thread miroir dans le salon secondaire ${config.scd_id}:`, error);
        }
    }
}

async function threadDelete(thread) {
    if (!thread.guild) return;

    // 1. Chercher si le thread supprimé est enregistré comme un thread principal (MAIN)
    const rows = await db.getall(
        `SELECT scd_thread_id FROM trs_threads WHERE guild_id = ? AND main_thread_id = ?`,
        [thread.guild.id, thread.id]
    );

    if (!rows || rows.length === 0) return; // Ce n'était pas un thread principal géré

    // 2. Supprimer chaque thread miroir secondaire sur Discord
    for (const r of rows) {
        try {
            const scdThread = await thread.guild.channels.cache.get(r.scd_thread_id);
            if (scdThread) {
                await scdThread.delete("Suppression automatique par le système de salons miroirs");
            }
        } catch (error) {
            if (error.code !== 10003) { // Ignore si déjà supprimé manuellement
                console.error(`Impossible de supprimer le thread miroir ${r.scd_thread_id}:`, error);
            }
        }
    }

    // 3. Nettoyer la table des liaisons de threads
    await db.delete(
        `DELETE FROM trs_threads WHERE guild_id = ? AND main_thread_id = ?`,
        [thread.guild.id, thread.id]
    );
}

async function threadUpdate(oldThread, newThread) {
    if (!newThread.guild) return;

    // 1. Vérifier si le thread modifié est un thread principal (MAIN)
    const rows = await db.getall(
        `SELECT scd_thread_id FROM trs_threads WHERE guild_id = ? AND main_thread_id = ?`,
        [newThread.guild.id, newThread.id]
    );

    if (!rows || rows.length === 0) return;

    // 2. Détecter les changements appliqués
    const updatePayload = {};

    if (oldThread.name !== newThread.name) {
        updatePayload.name = newThread.name;
    }
    if (oldThread.archived !== newThread.archived) {
        updatePayload.archived = newThread.archived;
    }
    if (oldThread.locked !== newThread.locked) {
        updatePayload.locked = newThread.locked;
    }
    if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
        updatePayload.rateLimitPerUser = newThread.rateLimitPerUser;
    }
    if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
        updatePayload.autoArchiveDuration = newThread.autoArchiveDuration;
    }

    if (Object.keys(updatePayload).length === 0) return;

    // 3. Appliquer les modifications sur chaque thread secondaire
    for (const r of rows) {
        try {
            const scdThread = await newThread.guild.channels.cache.get(r.scd_thread_id);
            if (scdThread) {
                await scdThread.edit(updatePayload);
            }
        } catch (error) {
            console.error(`Impossible de mettre à jour le thread miroir ${r.scd_thread_id}:`, error);
        }
    }
}


export const trAlterEvent = {
    channelCreate, 
    channelDelete, 
    channelUpdate, 
    threadCreate, 
    threadDelete, 
    threadUpdate
};
