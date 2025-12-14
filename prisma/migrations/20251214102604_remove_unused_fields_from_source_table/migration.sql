/*
  Warnings:

  - You are about to drop the column `alts_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `alts_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `btc_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `btc_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `eth_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `eth_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `sol_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `sol_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bearish_percentage` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bearish_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bearish_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bullish_percentage` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bullish_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_bullish_total_quantity` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_global_probility` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_reverse_signal_profit` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `source_total_quantity_signals` on the `Source` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Source` DROP COLUMN `alts_probility`,
    DROP COLUMN `alts_total_quantity`,
    DROP COLUMN `btc_probility`,
    DROP COLUMN `btc_total_quantity`,
    DROP COLUMN `eth_probility`,
    DROP COLUMN `eth_total_quantity`,
    DROP COLUMN `sol_probility`,
    DROP COLUMN `sol_total_quantity`,
    DROP COLUMN `source_bearish_percentage`,
    DROP COLUMN `source_bearish_probility`,
    DROP COLUMN `source_bearish_total_quantity`,
    DROP COLUMN `source_bullish_percentage`,
    DROP COLUMN `source_bullish_probility`,
    DROP COLUMN `source_bullish_total_quantity`,
    DROP COLUMN `source_global_probility`,
    DROP COLUMN `source_reverse_signal_profit`,
    DROP COLUMN `source_total_quantity_signals`;
