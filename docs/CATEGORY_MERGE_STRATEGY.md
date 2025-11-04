# Category Merge Strategy - Monthly Report

## Overview

The ServiceDesk application uses **TWO categorization systems** simultaneously:

1. **OLD System**: `ServiceCategory` table (legacy)
2. **NEW System**: `Category` table (3-tier hierarchy)

The Monthly Report intelligently **merges both systems** by category name.

---

## How Categories Are Assigned

### OLD System (ServiceCategory)
```
ticket.categoryId → ServiceCategory
service.categoryId → ServiceCategory
```

### NEW System (3-tier Category)
```
ticket.categoryId → Category (tier 1)
service.tier1CategoryId → Category
  ├─ tier2SubcategoryId → Subcategory
  └─ tier3ItemId → Item
```

---

## Merge Strategy

### By Name Matching

Categories are **merged by NAME**, not by ID.

**Example:**
```
Database State:
├─ ServiceCategory: "Hardware" (ID: abc123)
├─ Category: "Hardware" (ID: xyz789)

Tickets:
├─ 5 tickets use OLD "Hardware" (abc123)
├─ 10 tickets use NEW "Hardware" (xyz789)

Report Output:
└─ Hardware: 15 tickets total ✅
```

### Priority Order

When determining a ticket's category:

1. **Direct ticket category** (checks both tables)
2. **Service 3-tier category** (NEW system)
3. **Service old category** (OLD system)
4. **Uncategorized** (fallback)

---

## Implementation Details

### API Route
`/app/api/reports/technician/monthly/route.ts`

```typescript
// Build category map - MERGES by name
const categoryMap = new Map<string, CategoryData>();

tickets.forEach(ticket => {
  let categoryName = getCategoryName(ticket);

  // Initialize if doesn't exist
  if (!categoryMap.has(categoryName)) {
    categoryMap.set(categoryName, { ... });
  }

  // Increment counts (MERGING happens here!)
  categoryMap.get(categoryName).total++;
});
```

### Source Tracking

The API tracks which system(s) each category comes from:

```typescript
sources: Set<string> = ['service-old', 'service-3tier', 'ticket-direct']
```

This allows the report to show:
- Total categories
- Categories from OLD system only
- Categories from NEW system only
- **Categories merged from BOTH systems** ⭐

---

## User Experience

### Visual Indicator

When categories are successfully merged, users see an info banner:

```
ℹ️ Dual System Merge: This report merges categories from both
   OLD (ServiceCategory) and NEW (3-tier) systems.
   5 categories combined data from both systems.
```

### API Response

```json
{
  "categories": [...],
  "totals": {...},
  "mergeInfo": {
    "message": "Categories from OLD and NEW systems are merged by name",
    "stats": {
      "totalCategories": 18,
      "fromOldSystem": 3,
      "fromNewSystem": 10,
      "fromBothSystems": 5,
      "mergedSuccessfully": 5
    }
  }
}
```

---

## Benefits

### 1. **Seamless Transition**
Services can gradually migrate from OLD → NEW system without data loss.

### 2. **Accurate Reporting**
All tickets counted regardless of categorization system.

### 3. **Transparency**
Users see exactly what's being merged via visual indicators.

### 4. **No Data Duplication**
Same category name = ONE row (not two).

---

## Example Scenarios

### Scenario 1: Fully Migrated Category

```
ServiceCategory: (none)
Category: "ATM Services" → 25 tickets

Report: ATM Services = 25 tickets
Source: NEW system only
```

### Scenario 2: Mixed Usage

```
ServiceCategory: "Hardware" → 5 tickets
Category: "Hardware" → 10 tickets

Report: Hardware = 15 tickets
Source: BOTH systems (merged!)
```

### Scenario 3: Legacy Only

```
ServiceCategory: "Old Legacy Category" → 3 tickets
Category: (none)

Report: Old Legacy Category = 3 tickets
Source: OLD system only
```

---

## Database Schema

### OLD System

```sql
ServiceCategory {
  id        String
  name      String
  isActive  Boolean
}

Service {
  categoryId  String  -- references ServiceCategory
}
```

### NEW System

```sql
Category {
  id        String
  name      String
  isActive  Boolean
}

Subcategory {
  id          String
  name        String
  categoryId  String  -- references Category
}

Item {
  id              String
  name            String
  subcategoryId   String  -- references Subcategory
}

Service {
  tier1CategoryId    String  -- references Category
  tier2SubcategoryId String  -- references Subcategory
  tier3ItemId        String  -- references Item
}
```

---

## Verification

### Check Merge is Working

```bash
# Run the monthly report API
curl http://localhost:4000/api/reports/technician/monthly

# Look for mergeInfo in response
{
  "mergeInfo": {
    "stats": {
      "mergedSuccessfully": 5  # If > 0, merge is working!
    }
  }
}
```

### Check Category Distribution

```bash
npx tsx scripts/check-general-services.ts
```

---

## Future Enhancements

1. **Complete Migration Tool**: Script to migrate all services OLD → NEW
2. **Duplicate Detection**: Alert when same name exists with different data
3. **Category Mapping UI**: Admin interface to manage category mappings
4. **Historical Analysis**: Track migration progress over time

---

## Related Files

- API: `/app/api/reports/technician/monthly/route.ts`
- Frontend: `/app/reports/technician/monthly/page.tsx`
- Scripts: `/scripts/check-general-services.ts`
- Cleanup: `/scripts/fix-general-services-categorization.ts`

---

**Last Updated**: November 4, 2025
**Version**: 2.8.0
