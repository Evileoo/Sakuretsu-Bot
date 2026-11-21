-- Moderator visits of a village (/mod village visit and /mod village leave)
-- Run once on the database before starting the bot

CREATE TABLE IF NOT EXISTS `village_visit` (
  `village_tag` varchar(4) NOT NULL COMMENT 'Village visited',
  `member_id` varchar(30) NOT NULL COMMENT 'Discord ID of the moderator',
  `end_date` datetime NOT NULL COMMENT 'The access is removed at this date',
  `previous_overwrites` text COMMENT 'JSON {channelId: {allow, deny}}: overwrites of the moderator that existed before the visit, restored at the end',
  PRIMARY KEY (`village_tag`, `member_id`)
);
