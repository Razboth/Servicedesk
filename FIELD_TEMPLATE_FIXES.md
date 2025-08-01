# Field Template System Fixes

## Issues Fixed

### 1. Schema Mismatch
The initial implementation had fields in the wrong models:
- `isUserVisible` and `order` were incorrectly placed on `FieldTemplate`
- These fields actually belong to `ServiceField` and `ServiceFieldTemplate`

### 2. Correct Schema Structure

#### FieldTemplate Model
```prisma
model FieldTemplate {
  id            String              @id @default(cuid())
  name          String              @unique
  label         String
  description   String?
  type          FieldType
  isRequired    Boolean             @default(false)
  placeholder   String?
  helpText      String?
  defaultValue  String?
  options       Json?
  validation    Json?
  category      String?
  isActive      Boolean             @default(true)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  createdBy     String?
}
```

#### ServiceField Model (has order and isUserVisible)
```prisma
model ServiceField {
  id            String          @id @default(cuid())
  serviceId     String
  name          String
  label         String
  type          FieldType
  isRequired    Boolean         @default(false)
  isUserVisible Boolean         @default(true)
  placeholder   String?
  helpText      String?
  defaultValue  String?
  options       Json?
  validation    Json?
  order         Int             @default(0)
  isActive      Boolean         @default(true)
}
```

#### ServiceFieldTemplate Model (links templates to services)
```prisma
model ServiceFieldTemplate {
  id              String          @id @default(cuid())
  serviceId       String
  fieldTemplateId String
  order           Int             @default(0)
  isRequired      Boolean?
  isUserVisible   Boolean         @default(true)
  helpText        String?
  defaultValue    String?
}
```

### 3. Fixed Files
- `prisma/seed-field-templates.js` - Removed invalid fields from FieldTemplate creation
- `app/api/admin/field-templates/route.ts` - Fixed POST endpoint
- `app/api/admin/field-templates/[id]/route.ts` - Fixed PUT endpoint
- `app/api/admin/import/route.ts` - Fixed field template creation
- `app/admin/field-templates/page.tsx` - Removed UI elements for non-existent fields

## How to Run

1. Execute the seeding script from Windows:
   ```cmd
   .\run-seed-field-templates.bat
   ```

2. Or run directly:
   ```cmd
   node prisma/seed-field-templates.js
   ```

## Next Steps
After seeding, you can:
1. Visit `/admin/field-templates` to manage templates
2. Re-import services to test field creation
3. Link templates to services via the API