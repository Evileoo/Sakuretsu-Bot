-- Registration / waiting lists of the village events (/village list)
-- Run once on the database before starting the bot

CREATE TABLE IF NOT EXISTS `village_list` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Id of the list',
  `village_tag` varchar(4) NOT NULL COMMENT 'Village of the list',
  `channel_id` varchar(30) NOT NULL COMMENT 'Channel of the list message',
  `message_id` varchar(30) DEFAULT NULL COMMENT 'Message of the list, with the Join / Leave buttons',
  `title` varchar(100) NOT NULL COMMENT 'Name of the event',
  `description` varchar(1000) DEFAULT NULL COMMENT 'Details of the event',
  `slots` int DEFAULT NULL COMMENT 'Number of places, the next members go in the waiting list. NULL: no limit',
  `closed` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1: registrations closed',
  `creator_id` varchar(30) NOT NULL COMMENT 'Discord ID of the Kage or BroKage who created the list',
  `date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation date',
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `village_list_member` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Registration order: the first ones get the places',
  `list_id` int NOT NULL COMMENT 'Id of the list',
  `member_id` varchar(30) NOT NULL COMMENT 'Discord ID of the member',
  `date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration date',
  PRIMARY KEY (`id`),
  UNIQUE KEY `list_member` (`list_id`, `member_id`)
);
