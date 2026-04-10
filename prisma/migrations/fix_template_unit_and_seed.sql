-- ============================================
-- FIX: Drop old 'unit' column and seed templates
-- ============================================

BEGIN;

-- Step 1: Drop the old 'unit' column if it exists
ALTER TABLE "checklist_templates_v2" DROP COLUMN IF EXISTS "unit";

-- Step 2: Clear existing templates
DELETE FROM "checklist_templates_v2";

-- Step 3: Seed IT_INFRASTRUKTUR - SHIFT_SIANG templates
-- Section A: MONITORING AWAL HARI (08:00 - 09:00)
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 1, 'Cek status semua server via Grafana (100 VM + 30 Fisik)', 'Grafana/Prometheus', '08:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 2, 'Verifikasi CPU, Memory, Disk usage tidak melebihi threshold (>80%)', 'Grafana', '08:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 3, 'Cek status konektivitas DC Tekno dan Ruang Server SMS', 'Grafana', '08:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 4, 'Review alert Prometheus dari shift malam (jika ada)', 'Prometheus Alerts', '08:00', false, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 5, 'Cek backup seluruh database yang di-maintain internal berhasil', 'Backup System', '08:00', true, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 6, 'Verifikasi database BSGQRIS berjalan normal', 'Grafana/Loki', '08:00', true, 6, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 7, 'Cek file staging dari vendor CIP sudah diterima di file server', 'File Server', '08:00', true, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 8, 'Verifikasi report EOD sudah lengkap untuk Antasena dan OBOX', 'File Server', '08:00', true, 8, true, NOW(), NOW()),

-- Section B: MONITORING SISTEM KRITIKAL (09:00 - 10:00)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 1, 'Cek status koneksi BI-FAST', 'Middleware Dashboard', '09:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 2, 'Cek status koneksi Artajasa (ATM/Debit)', 'Middleware Dashboard', '09:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 3, 'Cek status koneksi Finnet', 'Middleware Dashboard', '09:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 4, 'Cek status koneksi Pajak', 'Middleware Dashboard', '09:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 5, 'Cek status koneksi Kementerian', 'Middleware Dashboard', '09:00', true, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 6, 'Cek status koneksi PBB Pemerintah Daerah', 'Middleware Dashboard', '09:00', true, 6, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 7, 'Cek status BSGTouch via aplikasi mobile (managed vendor CIP)', 'BSGTouch App', '09:00', true, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 8, 'Cek status BSGQRIS', 'Grafana/Loki', '09:00', true, 8, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 9, 'Cek status ATM Switching', 'Grafana', '09:00', true, 9, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 10, 'Cek uptime aplikasi surrounding', 'Grafana', '09:00', true, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 11, 'Cek grafik transaksi di Loki Stack (hijau = sukses, lainnya = error)', 'Loki Stack', NULL, true, 11, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 12, 'Review anomali transaksi jika ada indikasi error', 'Loki Stack', NULL, false, 12, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 13, 'Cek status alert mesin ATM via XMonitor', 'XMonitor', '09:00', true, 13, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'B', 'MONITORING SISTEM KRITIKAL (09:00 - 10:00)', 14, 'Infokan ke Group WhatsApp jika ada ATM bermasalah', 'WhatsApp', NULL, false, 14, true, NOW(), NOW()),

-- Section C: MONITORING BERKALA (Setiap 2 Jam)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 1, 'Monitoring uptime aplikasi kritikal', 'Grafana', '10:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 2, 'Monitoring uptime aplikasi surrounding', 'Grafana', '10:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 3, 'Monitoring metrics server via Grafana', 'Grafana', '10:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 4, 'Cek grafik transaksi Loki Stack', 'Loki Stack', '10:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 5, 'Cek status alert ATM via XMonitor', 'XMonitor', '10:00', true, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 6, 'Cek koneksi Host to Host tetap aktif', 'Middleware Dashboard', '10:00', true, 6, true, NOW(), NOW()),

-- Section D: PENUTUPAN SHIFT (18:00 - 20:00)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 1, 'Verifikasi seluruh cabang sudah berhasil close', 'Core Banking', '18:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 2, 'Catat issue/anomali yang perlu follow up di ServiceDesk', 'ServiceDesk', '18:00', false, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 3, 'Siapkan summary shift untuk handover ke shift malam', 'ServiceDesk', '19:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 4, 'Serah terima ke PIC Shift Malam', NULL, '20:00', true, 4, true, NOW(), NOW());

-- Step 4: Seed IT_INFRASTRUKTUR - SHIFT_MALAM templates
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "description", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
-- Section A: SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 1, 'Terima handover dari PIC Shift Siang', 'Baca catatan shift sebelumnya', NULL, '20:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 2, 'Review log insiden & eskalasi dari shift sebelumnya', NULL, 'ServiceDesk', '20:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 3, 'Verifikasi status semua sistem kritikal (hijau/merah)', NULL, 'Grafana Dashboard', '20:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 4, 'Konfirmasi buddy on-call tersedia & reachable', 'Catat nama buddy', 'WhatsApp', '20:00', true, 4, true, NOW(), NOW()),

-- Section B: MONITORING RUTIN MALAM (Setiap 2 Jam)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 1, 'Cek status semua server via Grafana (VM + Fisik)', 'CPU, Memory, Disk < 80%', 'Grafana/Prometheus', '22:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 2, 'Verifikasi konektivitas DC Tekno dan Ruang Server SMS', NULL, 'Grafana', '22:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 3, 'Review alert Prometheus - ada alert baru?', NULL, 'Prometheus Alerts', '22:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 4, 'Cek status koneksi Host-to-Host (BI-FAST, Artajasa, Finnet, Pajak, Kementerian, PBB)', NULL, 'Middleware Dashboard', '22:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 5, 'Cek status ATM via XMonitor - infokan ke Group WA jika bermasalah', NULL, 'XMonitor', '22:00', true, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 6, 'Cek status BSGTouch via aplikasi mobile', NULL, 'BSGTouch App', '22:00', true, 6, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 7, 'Cek status BSGQRIS', NULL, 'Grafana/Loki', '22:00', true, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 8, 'Cek grafik transaksi di Loki Stack (hijau = sukses)', NULL, 'Loki Stack', '22:00', true, 8, true, NOW(), NOW()),

-- Section C: MONITORING EOD & BACKUP (00:00 - 04:00)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'C', 'MONITORING EOD & BACKUP (00:00 - 04:00)', 1, 'Monitoring proses EOD dari vendor CIP', 'Biasanya 00:00-02:00', 'Koordinasi CIP', '00:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'C', 'MONITORING EOD & BACKUP (00:00 - 04:00)', 2, 'Verifikasi backup database berhasil', NULL, 'Backup System', '02:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'C', 'MONITORING EOD & BACKUP (00:00 - 04:00)', 3, 'Cek file staging dari vendor CIP sudah diterima', NULL, 'File Server', '04:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'C', 'MONITORING EOD & BACKUP (00:00 - 04:00)', 4, 'Verifikasi report EOD lengkap (Antasena, OBOX)', NULL, 'File Server', '04:00', true, 4, true, NOW(), NOW()),

-- Section D: PERSIAPAN AKHIR SHIFT (06:00 - 08:00)
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 1, 'Final check semua sistem sebelum handover', NULL, 'All Dashboards', '06:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 2, 'Kompilasi catatan insiden & eskalasi malam ini', NULL, 'ServiceDesk', '06:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 3, 'Siapkan summary shift untuk handover pagi', 'Tulis di kolom Keterangan', NULL, '07:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'IT_INFRASTRUKTUR', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 4, 'Serah terima ke PIC Shift Siang', 'Pastikan no open issues', NULL, '08:00', true, 4, true, NOW(), NOW());

-- Step 5: Seed KEAMANAN_SIBER - SHIFT_SIANG templates
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "description", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
-- Section A: MONITORING AWAL HARI (08:00 - 09:00)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 1, 'Review SIEM Dashboard untuk alert semalam', NULL, 'SIEM Dashboard', '08:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 2, 'Cek Firewall log untuk aktivitas mencurigakan', NULL, 'Firewall Console', '08:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 3, 'Verifikasi status Endpoint Protection di semua server', NULL, 'EDR Console', '08:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 4, 'Review brute-force detection alerts', NULL, 'SIEM', '08:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 5, 'Cek unauthorized access attempt dari log AD', NULL, 'Active Directory', '08:00', true, 5, true, NOW(), NOW()),

-- Section B: MONITORING KEAMANAN (09:00 - 10:00)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'B', 'MONITORING KEAMANAN (09:00 - 10:00)', 1, 'Analisis threat intelligence feed terbaru', NULL, 'Threat Intel Platform', '09:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'B', 'MONITORING KEAMANAN (09:00 - 10:00)', 2, 'Review IDS/IPS alerts', NULL, 'IDS/IPS Console', '09:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'B', 'MONITORING KEAMANAN (09:00 - 10:00)', 3, 'Cek status VPN dan remote access logs', NULL, 'VPN Console', '09:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'B', 'MONITORING KEAMANAN (09:00 - 10:00)', 4, 'Verifikasi certificate validity untuk aplikasi kritikal', NULL, 'Certificate Manager', '09:00', true, 4, true, NOW(), NOW()),

-- Section C: MONITORING BERKALA (Setiap 2 Jam)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 1, 'Review SIEM alerts real-time', NULL, 'SIEM Dashboard', '10:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 2, 'Cek status endpoint protection dan malware detection', NULL, 'EDR Console', '10:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 3, 'Monitor failed login attempts', NULL, 'SIEM/AD', '10:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 4, 'Cek network anomaly detection', NULL, 'Network Monitor', '10:00', true, 4, true, NOW(), NOW()),

-- Section D: PENUTUPAN SHIFT (18:00 - 20:00)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 1, 'Kompilasi security incidents hari ini', NULL, 'ServiceDesk', '18:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 2, 'Update security incident report', NULL, 'ServiceDesk', '18:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 3, 'Siapkan handover untuk shift malam', NULL, 'ServiceDesk', '19:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 4, 'Serah terima ke PIC Shift Malam', 'Highlight active threats', NULL, '20:00', true, 4, true, NOW(), NOW());

-- Step 6: Seed KEAMANAN_SIBER - SHIFT_MALAM templates
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "description", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
-- Section A: SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 1, 'Terima handover dari PIC Shift Siang', 'Review active threats', NULL, '20:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 2, 'Review security incidents dari shift siang', NULL, 'ServiceDesk', '20:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 3, 'Verifikasi status SIEM dan security tools', NULL, 'SIEM Dashboard', '20:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 4, 'Konfirmasi buddy on-call tersedia', NULL, 'WhatsApp', '20:00', true, 4, true, NOW(), NOW()),

-- Section B: MONITORING RUTIN MALAM (Setiap 2 Jam)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 1, 'Review SIEM alerts', NULL, 'SIEM Dashboard', '22:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 2, 'Cek Firewall logs untuk aktivitas mencurigakan', NULL, 'Firewall Console', '22:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 3, 'Monitor brute-force dan unauthorized access', NULL, 'SIEM/AD', '22:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 4, 'Cek endpoint protection status', NULL, 'EDR Console', '22:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 5, 'Monitor network anomaly detection', NULL, 'Network Monitor', '22:00', true, 5, true, NOW(), NOW()),

-- Section C: MONITORING TENGAH MALAM (00:00 - 04:00)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 1, 'Deep analysis SIEM logs tengah malam', NULL, 'SIEM Dashboard', '00:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 2, 'Review threat intelligence updates', NULL, 'Threat Intel Platform', '02:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 3, 'Cek scheduled security scan results', NULL, 'Vulnerability Scanner', '04:00', true, 3, true, NOW(), NOW()),

-- Section D: PERSIAPAN AKHIR SHIFT (06:00 - 08:00)
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 1, 'Final security status check', NULL, 'SIEM Dashboard', '06:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 2, 'Kompilasi security events malam ini', NULL, 'ServiceDesk', '06:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 3, 'Siapkan summary untuk handover pagi', NULL, NULL, '07:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'KEAMANAN_SIBER', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 4, 'Serah terima ke PIC Shift Siang', 'Brief active security issues', NULL, '08:00', true, 4, true, NOW(), NOW());

-- Step 7: Seed FRAUD_COMPLIANCE - SHIFT_SIANG templates
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "description", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
-- Section A: MONITORING AWAL HARI (08:00 - 09:00)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 1, 'Review FDS alerts semalam (54 rules, 13 kategori)', NULL, 'FDS Dashboard', '08:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 2, 'Cek transaksi suspicious dari overnight', NULL, 'FDS Dashboard', '08:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 3, 'Review status LTKM tracking', NULL, 'LTKM System', '08:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 4, 'Cek notifikasi fraud dari Artajasa', NULL, 'Email/Dashboard', '08:00', true, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'A', 'MONITORING AWAL HARI (08:00 - 09:00)', 5, 'Cek notifikasi fraud dari BI-FAST', NULL, 'Email/Dashboard', '08:00', true, 5, true, NOW(), NOW()),

-- Section B: ANALISIS FRAUD (09:00 - 10:00)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'B', 'ANALISIS FRAUD (09:00 - 10:00)', 1, 'Analisis detail transaksi high-risk yang terdeteksi', NULL, 'FDS Dashboard', '09:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'B', 'ANALISIS FRAUD (09:00 - 10:00)', 2, 'Verifikasi false positive dari FDS alerts', NULL, 'FDS Dashboard', '09:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'B', 'ANALISIS FRAUD (09:00 - 10:00)', 3, 'Follow up case fraud yang pending', NULL, 'Case Management', '09:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'B', 'ANALISIS FRAUD (09:00 - 10:00)', 4, 'Update status LTKM jika ada perubahan', NULL, 'LTKM System', '09:00', false, 4, true, NOW(), NOW()),

-- Section C: MONITORING BERKALA (Setiap 2 Jam)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 1, 'Review FDS alerts real-time', NULL, 'FDS Dashboard', '10:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 2, 'Monitor transaksi suspicious pattern', NULL, 'FDS Dashboard', '10:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 3, 'Cek notifikasi fraud dari switching', NULL, 'Email/Dashboard', '10:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'C', 'MONITORING BERKALA (Setiap 2 Jam)', 4, 'Review high-value transaction alerts', NULL, 'FDS Dashboard', '10:00', true, 4, true, NOW(), NOW()),

-- Section D: PENUTUPAN SHIFT (18:00 - 20:00)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 1, 'Kompilasi fraud cases hari ini', NULL, 'Case Management', '18:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 2, 'Update daily fraud report', NULL, 'Report System', '18:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 3, 'Siapkan handover untuk shift malam', NULL, 'ServiceDesk', '19:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_SIANG', 'D', 'PENUTUPAN SHIFT (18:00 - 20:00)', 4, 'Serah terima ke PIC Shift Malam', 'Brief pending cases', NULL, '20:00', true, 4, true, NOW(), NOW());

-- Step 8: Seed FRAUD_COMPLIANCE - SHIFT_MALAM templates
INSERT INTO "checklist_templates_v2" ("id", "checklistType", "shiftType", "section", "sectionTitle", "itemNumber", "title", "description", "toolSystem", "timeSlot", "isRequired", "order", "isActive", "createdAt", "updatedAt")
VALUES
-- Section A: SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 1, 'Terima handover dari PIC Shift Siang', 'Review pending fraud cases', NULL, '20:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 2, 'Review fraud cases dari shift siang', NULL, 'Case Management', '20:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 3, 'Verifikasi status FDS system', NULL, 'FDS Dashboard', '20:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'A', 'SERAH TERIMA & MULAI SHIFT (20:00 - 20:30)', 4, 'Konfirmasi buddy on-call tersedia', NULL, 'WhatsApp', '20:00', true, 4, true, NOW(), NOW()),

-- Section B: MONITORING RUTIN MALAM (Setiap 2 Jam)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 1, 'Review FDS alerts', NULL, 'FDS Dashboard', '22:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 2, 'Monitor transaksi suspicious overnight', NULL, 'FDS Dashboard', '22:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 3, 'Cek notifikasi fraud dari switching', NULL, 'Email/Dashboard', '22:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'B', 'MONITORING RUTIN MALAM (Setiap 2 Jam)', 4, 'Monitor high-risk transaction patterns', NULL, 'FDS Dashboard', '22:00', true, 4, true, NOW(), NOW()),

-- Section C: MONITORING TENGAH MALAM (00:00 - 04:00)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 1, 'Deep analysis overnight fraud patterns', NULL, 'FDS Dashboard', '00:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 2, 'Review LTKM status updates', NULL, 'LTKM System', '02:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'C', 'MONITORING TENGAH MALAM (00:00 - 04:00)', 3, 'Cek batch processing fraud detection results', NULL, 'FDS Dashboard', '04:00', true, 3, true, NOW(), NOW()),

-- Section D: PERSIAPAN AKHIR SHIFT (06:00 - 08:00)
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 1, 'Final fraud monitoring check', NULL, 'FDS Dashboard', '06:00', true, 1, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 2, 'Kompilasi overnight fraud events', NULL, 'Case Management', '06:00', true, 2, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 3, 'Siapkan summary untuk handover pagi', NULL, NULL, '07:00', true, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'FRAUD_COMPLIANCE', 'SHIFT_MALAM', 'D', 'PERSIAPAN AKHIR SHIFT (06:00 - 08:00)', 4, 'Serah terima ke PIC Shift Siang', 'Brief pending fraud cases', NULL, '08:00', true, 4, true, NOW(), NOW());

-- Step 9: Verify seeding
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM checklist_templates_v2;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TEMPLATE SEEDING COMPLETED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total templates created: %', total_count;
    RAISE NOTICE '';
END $$;

-- Show summary
SELECT "checklistType", "shiftType", COUNT(*) as count
FROM checklist_templates_v2
GROUP BY "checklistType", "shiftType"
ORDER BY "checklistType", "shiftType";

COMMIT;
