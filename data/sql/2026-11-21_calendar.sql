-- Generated calendar of the mission board (replaces the screenshot of the in-game calendar)
-- Run once on the database before starting the bot

ALTER TABLE `events`
  ADD COLUMN `calendar_only` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1: only shown in the calendar (not in the mission board, no reminder)',
  ADD COLUMN `calendar_color` varchar(10) DEFAULT NULL COMMENT 'Color of the event in the calendar (blue, green, purple, red, orange, teal)';
