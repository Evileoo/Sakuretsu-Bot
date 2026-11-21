-- Village applications (/my village apply) and Tri-Army Clash shared channels (/village tac)
-- Run once on the database before starting the bot

CREATE TABLE IF NOT EXISTS `application` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Id of the application',
  `member_id` varchar(30) NOT NULL COMMENT 'Discord ID of the member applying',
  `village_tag` varchar(4) NOT NULL COMMENT 'Village the member applies to',
  `message` varchar(500) DEFAULT NULL COMMENT 'Message of the member',
  `message_id` varchar(30) DEFAULT NULL COMMENT 'Application message in the village moderation channel',
  `date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Date of the application',
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `tac_channel` (
  `id` varchar(30) NOT NULL COMMENT 'Discord ID of the shared channel',
  `creator_tag` varchar(4) NOT NULL COMMENT 'Village of the Kage who created the channel',
  `creator_id` varchar(30) NOT NULL COMMENT 'Discord ID of the Kage who created the channel',
  `date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation date',
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `tac_village` (
  `channel_id` varchar(30) NOT NULL COMMENT 'Discord ID of the shared channel',
  `village_tag` varchar(4) NOT NULL COMMENT 'Village having access to the channel',
  PRIMARY KEY (`channel_id`, `village_tag`)
);
