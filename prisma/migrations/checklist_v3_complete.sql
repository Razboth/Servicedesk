-- ============================================
-- Migration: Checklist System v3 - Complete Fix
-- Date: 2026-02-05
-- Description: Fixes completedBy column, clears v2 data, re-seeds all templates
-- ============================================

-- Step 1: Add missing completedBy column
ALTER TABLE "server_access_checklist_items"
ADD COLUMN IF NOT EXISTS "completedBy" TEXT;

-- Step 2: Clear v2 data (order matters due to foreign keys)
DELETE FROM "server_access_checklist_items";
-- DELETE FROM "checklist_claims"; -- Table may not exist yet
DELETE FROM "server_access_daily_checklists";
DELETE FROM "server_access_checklist_templates";

-- ============================================
-- Step 3: Insert OPS_SIANG templates (21 items)
-- Users: A (STANDBY_BRANCH), B_2 (DAY_WEEKEND no server)
-- Time: 08:00-20:00
-- ============================================
INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType")
VALUES
-- 08:00 (5 items)
(gen_random_uuid(), 'Review Notes Permasalahan Kemarin', 'Review catatan dari shift sebelumnya', '08:00', 1, true, true, '08:00', 'OPS_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Pending Tickets', 'Periksa tiket pending dari sistem', '08:00', 2, true, true, '08:00', 'OPS_SIANG', 'PENDING_TICKETS'),
(gen_random_uuid(), 'Operasional Cabang Buka', 'Catat waktu pembukaan cabang', '08:00', 3, true, true, '08:00', 'OPS_SIANG', 'TIMESTAMP'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '08:00', 4, true, true, '08:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '08:00', 5, true, true, '08:00', 'OPS_SIANG', 'APP_STATUS'),
-- 10:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '10:00', 1, true, true, '10:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '10:00', 2, true, true, '10:00', 'OPS_SIANG', 'APP_STATUS'),
-- 12:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '12:00', 1, true, true, '12:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '12:00', 2, true, true, '12:00', 'OPS_SIANG', 'APP_STATUS'),
-- 14:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '14:00', 1, true, true, '14:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '14:00', 2, true, true, '14:00', 'OPS_SIANG', 'APP_STATUS'),
-- 16:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '16:00', 1, true, true, '16:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '16:00', 2, true, true, '16:00', 'OPS_SIANG', 'APP_STATUS'),
-- 18:00 (3 items)
(gen_random_uuid(), 'Operasional Cabang Tutup', 'Catat waktu penutupan cabang', '18:00', 1, true, true, '18:00', 'OPS_SIANG', 'TIMESTAMP'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '18:00', 2, true, true, '18:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '18:00', 3, true, true, '18:00', 'OPS_SIANG', 'APP_STATUS'),
-- 20:00 (3 items)
(gen_random_uuid(), 'Catatan Handover', 'Tulis catatan untuk shift berikutnya', '20:00', 1, true, true, '20:00', 'OPS_SIANG', 'TEXT_INPUT'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '20:00', 2, true, true, '20:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '20:00', 3, true, true, '20:00', 'OPS_SIANG', 'APP_STATUS');

-- ============================================
-- Step 4: Insert OPS_MALAM templates (11 items)
-- Users: D_2 (NIGHT_WEEKEND no server)
-- Time: 22:00-06:00
-- ============================================
INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType")
VALUES
-- 22:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '22:00', 1, true, true, '22:00', 'OPS_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '22:00', 2, true, true, '22:00', 'OPS_MALAM', 'APP_STATUS'),
-- 00:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '00:00', 1, true, true, '00:00', 'OPS_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '00:00', 2, true, true, '00:00', 'OPS_MALAM', 'APP_STATUS'),
-- 02:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '02:00', 1, true, true, '02:00', 'OPS_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '02:00', 2, true, true, '02:00', 'OPS_MALAM', 'APP_STATUS'),
-- 04:00 (2 items)
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '04:00', 1, true, true, '04:00', 'OPS_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '04:00', 2, true, true, '04:00', 'OPS_MALAM', 'APP_STATUS'),
-- 06:00 (3 items)
(gen_random_uuid(), 'Koordinasi Pembersihan Ruang Server', 'Koordinasi dengan Ibu Maria untuk pembersihan ruang server Samrat', '06:00', 1, true, true, '06:00', 'OPS_MALAM', 'CHECKBOX'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '06:00', 2, true, true, '06:00', 'OPS_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '06:00', 3, true, true, '06:00', 'OPS_MALAM', 'APP_STATUS');

-- ============================================
-- Step 5: Insert MONITORING_SIANG templates (18 items)
-- Users: E (unscheduled), B_1 (DAY_WEEKEND server), D_1 (NIGHT_WEEKEND server at 08:00)
-- Time: 08:00-20:00
-- ============================================
INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType")
VALUES
-- 08:00 (6 items)
(gen_random_uuid(), 'Check Extract Staging (Antasena)', 'Verifikasi proses extract staging di Antasena', '08:00', 1, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Extract Report (RPTViewer)', 'Verifikasi extract report di RPTViewer', '08:00', 2, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Backup DB (PDF Report)', 'Verifikasi backup database dari PDF report', '08:00', 3, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Server Metrics (PDF Report)', 'Verifikasi server metrics dari PDF report', '08:00', 4, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '08:00', 5, true, true, '08:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '08:00', 6, true, true, '08:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 10:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '10:00', 1, true, true, '10:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '10:00', 2, true, true, '10:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 12:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '12:00', 1, true, true, '12:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '12:00', 2, true, true, '12:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 14:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '14:00', 1, true, true, '14:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '14:00', 2, true, true, '14:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 16:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '16:00', 1, true, true, '16:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '16:00', 2, true, true, '16:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 18:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '18:00', 1, true, true, '18:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '18:00', 2, true, true, '18:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),
-- 20:00 (2 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '20:00', 1, true, true, '20:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '20:00', 2, true, true, '20:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS');

-- ============================================
-- Step 6: Insert MONITORING_MALAM templates (25 items)
-- Users: C (NIGHT_WEEKDAY server), D_1 (NIGHT_WEEKEND server)
-- Time: 22:00-06:00
-- Note: At night, Grafana + Apps are in MONITORING (not OPS)
-- ============================================
INSERT INTO "server_access_checklist_templates"
("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType")
VALUES
-- 22:00 (4 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '22:00', 1, true, true, '22:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '22:00', 2, true, true, '22:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '22:00', 3, true, true, '22:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '22:00', 4, true, true, '22:00', 'MONITORING_MALAM', 'APP_STATUS'),
-- 00:00 (4 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '00:00', 1, true, true, '00:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '00:00', 2, true, true, '00:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '00:00', 3, true, true, '00:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '00:00', 4, true, true, '00:00', 'MONITORING_MALAM', 'APP_STATUS'),
-- 02:00 (4 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '02:00', 1, true, true, '02:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '02:00', 2, true, true, '02:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '02:00', 3, true, true, '02:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '02:00', 4, true, true, '02:00', 'MONITORING_MALAM', 'APP_STATUS'),
-- 04:00 (4 items)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '04:00', 1, true, true, '04:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '04:00', 2, true, true, '04:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '04:00', 3, true, true, '04:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '04:00', 4, true, true, '04:00', 'MONITORING_MALAM', 'APP_STATUS'),
-- 06:00 (5 items)
(gen_random_uuid(), 'Koordinasi Pembersihan Ruang Server', 'Koordinasi dengan Ibu Maria untuk pembersihan ruang server Samrat', '06:00', 1, true, true, '06:00', 'MONITORING_MALAM', 'CHECKBOX'),
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '06:00', 2, true, true, '06:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '06:00', 3, true, true, '06:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan (15 menit terakhir)', '06:00', 4, true, true, '06:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, Supporting', '06:00', 5, true, true, '06:00', 'MONITORING_MALAM', 'APP_STATUS');

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the migration:
-- SELECT "checklistType", COUNT(*) as item_count FROM "server_access_checklist_templates" GROUP BY "checklistType" ORDER BY "checklistType";
-- Expected results:
-- MONITORING_MALAM: 25
-- MONITORING_SIANG: 18
-- OPS_MALAM: 11
-- OPS_SIANG: 21
-- Total: 75
