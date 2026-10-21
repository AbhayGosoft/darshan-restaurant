-- AlterTable
ALTER TABLE `booking_preorder_items` ADD COLUMN `translations` JSON NULL;

-- AlterTable
ALTER TABLE `menu_categories` ADD COLUMN `translations` JSON NULL;

-- AlterTable
ALTER TABLE `menu_items` ADD COLUMN `translations` JSON NULL;

-- AlterTable
ALTER TABLE `restaurant_bookings` ADD COLUMN `translations_snapshot` JSON NULL;

-- AlterTable
ALTER TABLE `restaurant_categories` ADD COLUMN `translations` JSON NULL;

-- AlterTable
ALTER TABLE `restaurant_users` ADD COLUMN `language` VARCHAR(8) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `restaurants` ADD COLUMN `translations` JSON NULL;
