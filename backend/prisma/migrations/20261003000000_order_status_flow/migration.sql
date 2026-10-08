-- Slot-based booking is replaced by same-day orders with a customer-chosen arrival time.

-- AlterTable: restaurant opening hours (arrival times must fall inside them)
ALTER TABLE `restaurants`
    ADD COLUMN `opens_at` VARCHAR(5) NOT NULL DEFAULT '09:00',
    ADD COLUMN `closes_at` VARCHAR(5) NOT NULL DEFAULT '23:00';

-- AlterTable: order lifecycle statuses + who cancelled / why rejected + per-status timestamps
ALTER TABLE `restaurant_bookings`
    MODIFY `status` ENUM('UPCOMING', 'ACKNOWLEDGED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'UPCOMING',
    ADD COLUMN `cancelled_by` ENUM('CUSTOMER', 'RESTAURANT') NULL,
    ADD COLUMN `rejection_reason` VARCHAR(500) NULL,
    ADD COLUMN `rejected_at` DATETIME(3) NULL,
    ADD COLUMN `acknowledged_at` DATETIME(3) NULL,
    ADD COLUMN `preparing_at` DATETIME(3) NULL,
    ADD COLUMN `ready_at` DATETIME(3) NULL,
    ADD COLUMN `completed_at` DATETIME(3) NULL;

-- AlterTable: customer notification types for each status change
ALTER TABLE `notifications`
    MODIFY `type` ENUM('BOOKING_CONFIRMED', 'BOOKING_MODIFIED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'BOOKING_ACKNOWLEDGED', 'BOOKING_PREPARING', 'BOOKING_READY', 'BOOKING_COMPLETED', 'BOOKING_REJECTED') NOT NULL;

-- Data: bookings from earlier days that were never cancelled already happened — close them as COMPLETED
-- so they don't sit in the restaurant's "upcoming" queue under the new flow.
UPDATE `restaurant_bookings`
    SET `status` = 'COMPLETED', `completed_at` = CURRENT_TIMESTAMP(3)
    WHERE `status` = 'UPCOMING' AND `date` < CURDATE();

-- DropForeignKey
ALTER TABLE `slot_configurations` DROP FOREIGN KEY `slot_configurations_restaurant_id_fkey`;

-- DropTable
DROP TABLE `slot_configurations`;
