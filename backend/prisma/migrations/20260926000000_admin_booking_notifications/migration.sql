-- AlterTable
ALTER TABLE `admin_users` ADD COLUMN `notifications_seen_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `restaurant_bookings_restaurant_id_created_at_idx` ON `restaurant_bookings`(`restaurant_id`, `created_at`);
