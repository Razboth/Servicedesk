# Daily Checklist (Server Access) - Flow Documentation

## Overview

The Daily Checklist is a standalone checklist system for users with **server access** privileges. It is separate from the shift report checklist and allows server-access users to complete daily server monitoring tasks with time-locked items.

---

## Access Requirements

- User must have `StaffShiftProfile.hasServerAccess = true`
- If user doesn't have server access, the Daily Checklist tab will not appear

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAILY CHECKLIST FLOW                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User       │     │  Shift Report    │     │  API            │
│   (Server    │────▶│  Card Component  │────▶│  /api/server-   │
│   Access)    │     │                  │     │  checklist      │
└──────────────┘     └──────────────────┘     └─────────────────┘
                              │                        │
                              │                        ▼
                              │              ┌─────────────────┐
                              │              │ Check hasServer │
                              │              │ Access flag     │
                              │              └─────────────────┘
                              │                        │
                              │           ┌────────────┴────────────┐
                              │           │                         │
                              │      NO ACCESS               HAS ACCESS
                              │           │                         │
                              │           ▼                         ▼
                              │     ┌──────────┐          ┌─────────────────┐
                              │     │  403     │          │ Find/Create     │
                              │     │ Forbidden│          │ Today's         │
                              │     └──────────┘          │ Checklist       │
                              │                           └─────────────────┘
                              │                                    │
                              │                                    ▼
                              │                           ┌─────────────────┐
                              │                           │ Load Templates  │
                              │                           │ (if new day)    │
                              │                           └─────────────────┘
                              │                                    │
                              │                                    ▼
                              │                           ┌─────────────────┐
                              │                           │ Add Lock Status │
                              │                           │ to Each Item    │
                              │                           └─────────────────┘
                              │                                    │
                              ◀────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Display Daily   │
                    │ Checklist Tab   │
                    │ with PIC Info   │
                    └─────────────────┘
```

---

## Components

### 1. Shift Report Card (`components/technician/shift-report-card.tsx`)
- Displays the "Daily Checklist" tab only if `hasServerAccess = true`
- Shows PIC (Person In Charge) as the logged-in user (read-only)
- Fetches daily checklist from `/api/server-checklist`

### 2. Server Access Checklist (`components/technician/server-access-checklist.tsx`)
- Displays checklist items grouped by category
- Shows lock status for time-locked items
- Allows completing/skipping items and adding notes

### 3. Time Lock Utility (`lib/time-lock.ts`)
- All times are in **WITA (UTC+8)** timezone
- `isItemUnlocked()` - Check if item is unlocked based on current WITA time
- `getLockStatusMessage()` - Get Indonesian message for locked items

---

## API Endpoints

### GET `/api/server-checklist`
Get or create today's daily checklist for the current user.

**Response:**
```json
{
  "id": "checklist-id",
  "userId": "user-id",
  "date": "2024-01-15",
  "status": "PENDING" | "IN_PROGRESS" | "COMPLETED",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "items": [
    {
      "id": "item-id",
      "title": "Pemantauan Server Pukul 10:00",
      "description": "...",
      "category": "SERVER_HEALTH",
      "status": "PENDING",
      "unlockTime": "10:00",
      "isLocked": true,
      "lockMessage": "Tersedia dalam 2 jam 30 menit (pukul 10:00)"
    }
  ],
  "stats": {
    "total": 14,
    "completed": 0,
    "pending": 14,
    "locked": 4
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

**Validation:**
- Cannot complete items that are still time-locked
- Returns error if item is locked: `"Item masih terkunci. Tersedia dalam X jam Y menit"`

---

## Time-Locked Items

Items can have an `unlockTime` field (format: `"HH:mm"` in WITA/UTC+8).

| Unlock Time | Description |
|-------------|-------------|
| `10:00` | Available after 10:00 AM WITA |
| `12:00` | Available after 12:00 PM WITA |
| `14:00` | Available after 2:00 PM WITA |
| `16:00` | Available after 4:00 PM WITA |
| `22:00` | Available after 10:00 PM WITA |
| `null` | Always available |

### Current Periodic Checklist Schedule

| Time (WITA) | Checklist Item |
|-------------|----------------|
| 07:00 | Cek antrian job terjadwal |
| 10:00 | Pemantauan Server Pukul 10:00 |
| 12:00 | Pemantauan Server Pukul 12:00 |
| 14:00 | Pemantauan Server Pukul 14:00 |
| 16:00 | Pemantauan Server Pukul 16:00 |
| 22:00 | Verifikasi backup database utama |
| 22:30 | Verifikasi backup incremental |

---

## Categories

| Category | Label (ID) | Icon | Items |
|----------|------------|------|-------|
| `BACKUP_VERIFICATION` | Verifikasi Backup | Database | 3 |
| `SERVER_HEALTH` | Kesehatan Server | Server | 7 (incl. 4 periodic) |
| `SECURITY_CHECK` | Pemeriksaan Keamanan | Shield | 2 |
| `MAINTENANCE` | Pemeliharaan | Wrench | 2 |

---

## Database Schema

### ServerAccessChecklistTemplate
Templates for creating daily checklist items.

```prisma
model ServerAccessChecklistTemplate {
  id          String   @id @default(cuid())
  title       String
  description String?
  category    ServerChecklistCategory
  order       Int      @default(0)
  isRequired  Boolean  @default(true)
  isActive    Boolean  @default(true)
  unlockTime  String?  // "HH:mm" in WITA
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### ServerAccessDailyChecklist
Daily checklist instance per user.

```prisma
model ServerAccessDailyChecklist {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date
  status      ServerChecklistStatus @default(PENDING)
  completedAt DateTime?
  notes       String?
  items       ServerAccessChecklistItem[]
  user        User     @relation(...)

  @@unique([userId, date])
}
```

### ServerAccessChecklistItem
Individual checklist items.

```prisma
model ServerAccessChecklistItem {
  id          String   @id @default(cuid())
  checklistId String
  title       String
  description String?
  category    ServerChecklistCategory
  order       Int      @default(0)
  isRequired  Boolean  @default(true)
  status      ShiftChecklistStatus @default(PENDING)
  completedAt DateTime?
  notes       String?
  unlockTime  String?  // "HH:mm" in WITA
  checklist   ServerAccessDailyChecklist @relation(...)
}
```

---

## UI States

### Locked Item
- Checkbox disabled
- Shows lock icon with unlock time
- Yellow/amber background
- Message: "Tersedia dalam X jam Y menit (pukul HH:mm)"

### Unlocked Item
- Checkbox enabled
- Can be completed or skipped (if not required)
- Can add notes

### Completed Item
- Shows green checkmark
- Text has strikethrough
- Read-only

---

## Deployment

1. Run migration SQL (create tables)
2. Run seed SQL (insert templates)
3. Run `npx prisma generate`

Or use npm scripts:
```bash
npx prisma db push
npm run db:seed:server-checklist
```
