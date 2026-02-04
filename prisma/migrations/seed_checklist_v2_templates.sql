-- ============================================
-- Seed: Checklist System v2 Templates
-- Date: 2026-02-05
-- Description: Seeds all checklist templates for OPS and MONITORING
-- ============================================

-- Clear existing templates first
TRUNCATE TABLE "server_access_checklist_templates" CASCADE;

-- ============================================
-- OPS_SIANG Templates (08:00 - 20:00)
-- For users WITHOUT server access: A (STANDBY_BRANCH), B_2 (DAY_WEEKEND no server)
-- ============================================

-- 08:00 Items
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType") VALUES
(gen_random_uuid(), 'Review Notes Permasalahan Kemarin', 'Review catatan permasalahan dari shift sebelumnya', '08:00', 1, true, true, '08:00', 'OPS_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Pending Tickets', 'Periksa tiket yang masih pending dari sistem', '08:00', 2, true, true, '08:00', 'OPS_SIANG', 'PENDING_TICKETS'),
(gen_random_uuid(), 'Operasional Cabang Buka', 'Catat waktu pembukaan operasional cabang', '08:00', 3, true, true, '08:00', 'OPS_SIANG', 'TIMESTAMP'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '08:00', 4, true, true, '08:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '08:00', 5, true, true, '08:00', 'OPS_SIANG', 'APP_STATUS'),

-- 10:00 Items
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '10:00', 1, true, true, '10:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '10:00', 2, true, true, '10:00', 'OPS_SIANG', 'APP_STATUS'),

-- 12:00 Items
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '12:00', 1, true, true, '12:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '12:00', 2, true, true, '12:00', 'OPS_SIANG', 'APP_STATUS'),

-- 14:00 Items
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '14:00', 1, true, true, '14:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '14:00', 2, true, true, '14:00', 'OPS_SIANG', 'APP_STATUS'),

-- 16:00 Items
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '16:00', 1, true, true, '16:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '16:00', 2, true, true, '16:00', 'OPS_SIANG', 'APP_STATUS'),

-- 18:00 Items
(gen_random_uuid(), 'Operasional Cabang Tutup', 'Catat waktu penutupan operasional cabang', '18:00', 1, true, true, '18:00', 'OPS_SIANG', 'TIMESTAMP'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '18:00', 2, true, true, '18:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '18:00', 3, true, true, '18:00', 'OPS_SIANG', 'APP_STATUS'),

-- 20:00 Items
(gen_random_uuid(), 'Catatan Handover', 'Tulis catatan serah terima untuk shift berikutnya', '20:00', 1, true, true, '20:00', 'OPS_SIANG', 'TEXT_INPUT'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '20:00', 2, true, true, '20:00', 'OPS_SIANG', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '20:00', 3, true, true, '20:00', 'OPS_SIANG', 'APP_STATUS');

-- ============================================
-- OPS_MALAM Templates (06:00 only)
-- For D_2 (NIGHT_WEEKEND no server access)
-- ============================================

INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType") VALUES
(gen_random_uuid(), 'Koordinasi Pembersihan Ruang Server', 'Koordinasi dengan Ibu Maria untuk pembersihan ruang server', '06:00', 1, true, true, '06:00', 'OPS_MALAM', 'CHECKBOX');

-- ============================================
-- MONITORING_SIANG Templates (08:00 - 20:00)
-- For users WITH server access: E (DBA/TS), B_1 (DAY_WEEKEND + server)
-- ============================================

-- 08:00 Items (Morning checks)
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType") VALUES
(gen_random_uuid(), 'Check Extract Staging (Antasena)', 'Verifikasi proses extract staging di Antasena', '08:00', 1, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Extract Report (RPTViewer)', 'Verifikasi extract report di RPTViewer', '08:00', 2, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Backup DB (PDF Report)', 'Verifikasi backup database dari PDF report', '08:00', 3, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Check Server Metrics (PDF Report)', 'Verifikasi server metrics dari PDF report', '08:00', 4, true, true, '08:00', 'MONITORING_SIANG', 'CHECKBOX'),
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '08:00', 5, true, true, '08:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '08:00', 6, true, true, '08:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 10:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '10:00', 1, true, true, '10:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '10:00', 2, true, true, '10:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 12:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '12:00', 1, true, true, '12:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '12:00', 2, true, true, '12:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 14:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '14:00', 1, true, true, '14:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '14:00', 2, true, true, '14:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 16:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '16:00', 1, true, true, '16:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '16:00', 2, true, true, '16:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 18:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '18:00', 1, true, true, '18:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '18:00', 2, true, true, '18:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS'),

-- 20:00 Items
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '20:00', 1, true, true, '20:00', 'MONITORING_SIANG', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '20:00', 2, true, true, '20:00', 'MONITORING_SIANG', 'AVAILABILITY_STATUS');

-- ============================================
-- MONITORING_MALAM Templates (22:00 - 06:00)
-- For users WITH server access on night shift: C (NIGHT_WEEKDAY), D_1 (NIGHT_WEEKEND + server)
-- Note: At night, Grafana + Apps are MERGED into Monitoring (not in Ops)
-- ============================================

-- 22:00 Items
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "checklistType", "inputType") VALUES
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '22:00', 1, true, true, '22:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '22:00', 2, true, true, '22:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '22:00', 3, true, true, '22:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '22:00', 4, true, true, '22:00', 'MONITORING_MALAM', 'APP_STATUS'),

-- 00:00 Items (H+1)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '00:00', 1, true, true, '00:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '00:00', 2, true, true, '00:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '00:00', 3, true, true, '00:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '00:00', 4, true, true, '00:00', 'MONITORING_MALAM', 'APP_STATUS'),

-- 02:00 Items (H+1)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '02:00', 1, true, true, '02:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '02:00', 2, true, true, '02:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '02:00', 3, true, true, '02:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '02:00', 4, true, true, '02:00', 'MONITORING_MALAM', 'APP_STATUS'),

-- 04:00 Items (H+1)
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '04:00', 1, true, true, '04:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '04:00', 2, true, true, '04:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '04:00', 3, true, true, '04:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '04:00', 4, true, true, '04:00', 'MONITORING_MALAM', 'APP_STATUS'),

-- 06:00 Items (H+1) - includes cleaning coordination
(gen_random_uuid(), 'Koordinasi Pembersihan Ruang Server', 'Koordinasi dengan Ibu Maria untuk pembersihan ruang server', '06:00', 1, true, true, '06:00', 'MONITORING_MALAM', 'CHECKBOX'),
(gen_random_uuid(), 'Status Alert ATM', 'Periksa daftar ATM dengan alarm aktif', '06:00', 2, true, true, '06:00', 'MONITORING_MALAM', 'ATM_ALERT'),
(gen_random_uuid(), 'Status Operasional/Availability', 'Status koneksi dan akses aplikasi', '06:00', 3, true, true, '06:00', 'MONITORING_MALAM', 'AVAILABILITY_STATUS'),
(gen_random_uuid(), 'Status Grafik Grafana', 'Input persentase 10 layanan dari Grafana (15 menit terakhir)', '06:00', 4, true, true, '06:00', 'MONITORING_MALAM', 'GRAFANA_STATUS'),
(gen_random_uuid(), 'Status Aplikasi', 'Status Core, Surrounding, dan Supporting', '06:00', 5, true, true, '06:00', 'MONITORING_MALAM', 'APP_STATUS');

-- ============================================
-- Verification
-- ============================================
-- SELECT "checklistType", COUNT(*) as item_count FROM "server_access_checklist_templates" GROUP BY "checklistType";
-- Expected: OPS_SIANG: 21, OPS_MALAM: 1, MONITORING_SIANG: 18, MONITORING_MALAM: 25
