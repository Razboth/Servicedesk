# Daily Checklist System - Flow Documentation

## Overview

The Daily Checklist system provides **4 separate checklist types** for different shift roles and time periods. Each checklist is designed for specific personnel and unlocks items based on the time of day.

---

## Checklist Types

| Type | Label | PIC | Time Period | Items |
|------|-------|-----|-------------|-------|
| `HARIAN` | Checklist Harian | Shift Operasional | 08:00 - branch closed | 4 |
| `SERVER_SIANG` | Server (Siang) | Any Server Access | 08:00 - 20:00 | 8 |
| `SERVER_MALAM` | Server (Malam) | Shift Standby | 20:00 - 07:59 | 10 |
| `AKHIR_HARI` | Akhir Hari | Shift Operasional | Before handover (~17:00-20:00) | 5 |

---

## Shift Types & Access

### Shift Operasional (08:00 - branch closed)
- **Available Checklists:** HARIAN, SERVER_SIANG (if hasServerAccess), AKHIR_HARI

### Shift Standby (20:00 - 07:59)
- **Available Checklists:** SERVER_MALAM (requires hasServerAccess)

---

## Periodic Server Monitoring

Every 2 hours, server status must be checked:

### Daytime (SERVER_SIANG)
| Time (WITA) | Item |
|-------------|------|
| 08:00 | Pemantauan Server Pukul 08:00 |
| 10:00 | Pemantauan Server Pukul 10:00 |
| 12:00 | Pemantauan Server Pukul 12:00 |
| 14:00 | Pemantauan Server Pukul 14:00 |
| 16:00 | Pemantauan Server Pukul 16:00 |
| 18:00 | Pemantauan Server Pukul 18:00 |

### Nighttime (SERVER_MALAM)
| Time (WITA) | Item |
|-------------|------|
| 20:00 | Pemantauan Server Pukul 20:00 |
| 22:00 | Pemantauan Server Pukul 22:00 |
| 00:00 | Pemantauan Server Pukul 00:00 |
| 02:00 | Pemantauan Server Pukul 02:00 |
| 04:00 | Pemantauan Server Pukul 04:00 |
| 06:00 | Pemantauan Server Pukul 06:00 |

---

## Access Requirements

| Checklist Type | Requirements |
|----------------|--------------|
| HARIAN | On operational shift (DAY_WEEKEND, STANDBY_BRANCH) |
| SERVER_SIANG | `hasServerAccess = true` |
| SERVER_MALAM | `hasServerAccess = true` + On night/standby shift |
| AKHIR_HARI | On operational shift |

---

## API Endpoints

### GET `/api/server-checklist`

Get or create today's checklist for the current user.

**Query Parameters:**
- `type` (optional): `HARIAN | SERVER_SIANG | SERVER_MALAM | AKHIR_HARI`
  - If not specified, auto-determines based on current time

**Response:**
```json
{
  "id": "checklist-id",
  "userId": "user-id",
  "date": "2024-01-15",
  "checklistType": "SERVER_SIANG",
  "status": "PENDING",
  "items": [...],
  "stats": {
    "total": 8,
    "completed": 0,
    "pending": 8,
    "locked": 4
  },
  "shiftInfo": {
    "hasServerAccess": true,
    "isOnNightShift": false,
    "isOnOpsShift": true,
    "currentShiftType": "DAY_WEEKEND"
  }
}
```

### PUT `/api/server-checklist/items`

Update checklist items (complete, skip, add notes).

**Request:**
```json
{
  "items": [
    { "id": "item-id", "status": "COMPLETED" },
    { "id": "item-id", "notes": "Some notes" }
  ]
}
```

---

## Midnight Crossover Handling

For SERVER_MALAM (night shift), items span 2 calendar days:
- 20:00, 22:00 → Same calendar day as shift start
- 00:00, 02:00, 04:00, 06:00 → Next calendar day

The API automatically uses the previous day's date when accessed between 00:00-07:59 for SERVER_MALAM checklist.

---

## Database Schema

### DailyChecklistType Enum
```prisma
enum DailyChecklistType {
  HARIAN           // Shift Ops daily tasks
  SERVER_SIANG     // Server daytime (08:00-20:00)
  SERVER_MALAM     // Server nighttime (20:00-07:59)
  AKHIR_HARI       // End of day handover
}
```

### ServerAccessChecklistTemplate
```prisma
model ServerAccessChecklistTemplate {
  id            String               @id @default(cuid())
  title         String
  description   String?
  category      ServerChecklistCategory
  checklistType DailyChecklistType   @default(SERVER_SIANG)
  order         Int                  @default(0)
  isRequired    Boolean              @default(true)
  isActive      Boolean              @default(true)
  unlockTime    String?              // "HH:mm" in WITA
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
}
```

### ServerAccessDailyChecklist
```prisma
model ServerAccessDailyChecklist {
  id            String               @id @default(cuid())
  userId        String
  date          DateTime             @db.Date
  checklistType DailyChecklistType   @default(SERVER_SIANG)
  status        ServerChecklistStatus @default(PENDING)
  completedAt   DateTime?
  notes         String?
  items         ServerAccessChecklistItem[]
  user          User                 @relation(...)

  @@unique([userId, date, checklistType])
}
```

---

## UI Components

### Shift Report Card (`components/technician/shift-report-card.tsx`)
- Dynamically shows tabs based on user's shift type and access
- Fetches available checklist types from API
- Lazy loads checklists when tab is clicked

### Server Access Checklist (`components/technician/server-access-checklist.tsx`)
- Displays checklist items grouped by category
- Shows lock status for time-locked items
- Allows completing/skipping items and adding notes

---

## Categories

| Category | Label (ID) | Description |
|----------|------------|-------------|
| `BACKUP_VERIFICATION` | Verifikasi Backup | Backup verification tasks |
| `SERVER_HEALTH` | Kesehatan Server | Periodic server monitoring |
| `SECURITY_CHECK` | Pemeriksaan Keamanan | Security checks |
| `MAINTENANCE` | Pemeliharaan | General maintenance tasks |

---

## Deployment

1. Update schema and migrate:
```bash
npx prisma db push
npx prisma generate
```

2. Seed templates (clears existing and creates new):
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-server-checklist.ts --clear
```

---

## Summary

- **4 distinct checklist types** instead of 1
- **12 periodic server checks** (6 daytime + 6 nighttime)
- **Access control** based on shift type + server access
- **Midnight handling** for night shift items
- **Dynamic UI** shows correct checklists per user's shift
