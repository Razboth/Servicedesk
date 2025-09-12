# Legacy Ticket Import Improvements

## Overview
Enhanced the ManageEngine legacy ticket import system with improved branch mapping and dedicated service assignment.

## Key Improvements

### 1. Enhanced Branch Mapping System

#### Previous System
- Basic pattern matching from email domains and usernames
- Limited branch recognition
- Generic branch creation

#### New System ✅
- **Intelligent Branch Name Recognition**: Maps Indonesian branch names to proper branch codes
- **Comprehensive Coverage**: Supports various branch name formats
- **Proper Code Assignment**: Uses 3-digit branch codes (001, 047, etc.)

#### Branch Mapping Examples
```javascript
// Main Branch
'Cabang Utama' → Branch Code: '001'
'Kantor Pusat' → Branch Code: '001'

// Branch Offices (Cabang Pembantu/Capem)
'Cabang Pembantu Sam Ratulangi' → Branch Code: '047'
'Sam Ratulangi' → Branch Code: '047'

// Other Branches
'Tomohon' → Branch Code: '002'
'Bitung' → Branch Code: '003'
'Kotamobagu' → Branch Code: '004'
'Airmadidi' → Branch Code: '005'
'Minahasa' → Branch Code: '006'
'Tondano' → Branch Code: '007'
'Manado' → Branch Code: '008'
'Cempaka Putih' → Branch Code: '024'
'Tahuna' → Branch Code: '009'
'Sangihe' → Branch Code: '010'
'Talaud' → Branch Code: '011'
'Gorontalo' → Branch Code: '012'
'Limboto' → Branch Code: '013'
'Marisa' → Branch Code: '014'
'Kwandang' → Branch Code: '015'
```

#### Mapping Sources
The system searches for branch patterns in:
1. **Username** from ManageEngine
2. **Email address** (both local part and domain)
3. **Display name** from user info
4. **Site name** from ManageEngine

### 2. Dedicated Legacy Tickets Service ✅

#### Service Details
- **Name**: "Legacy Tickets"
- **Category**: "Legacy Systems" 
- **Purpose**: Dedicated service for all imported legacy tickets
- **Configuration**:
  - No approval required
  - 24h SLA
  - Medium priority default
  - Not visible in public catalog
  - Automatic assignment

#### Benefits
- **Consistent Categorization**: All legacy tickets use the same service
- **Easy Identification**: Clear distinction from new tickets
- **Simplified Reporting**: Easy to filter and report on legacy data
- **Historical Preservation**: Maintains original categorization in `originalData` field

### 3. Import Process Improvements

#### Data Preservation
- **Original Data**: Complete ManageEngine ticket data stored in `originalData` JSON field
- **Branch Information**: Original site data preserved alongside new branch mapping
- **Service History**: Original category/subcategory/item data maintained
- **User Details**: Complete requester and technician information preserved

#### Enhanced Logging
```bash
# Example output with verbose logging
🌍 Mapped branch code from user info: 047
🏢 Created branch: 047 - Branch Sam Ratulangi
✅ Using Legacy Tickets service: cmfdst2930001hll8j4lg4li9
✅ Imported legacy ticket: LEG2025000001 (ME ID: 12345)
```

## Usage

### Standard Import
```bash
node scripts/import-manageengine-tickets.js --api-key YOUR_API_KEY --insecure
```

### Test with Verbose Logging
```bash
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --limit 10 \
  --dry-run \
  --verbose \
  --insecure
```

### Production Import
```bash
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --batch-size 25 \
  --insecure
```

## Database Changes

### New Tables
- **LegacyTicket**: Complete separate table for legacy tickets
- **LegacyTicketComment**: Comments from legacy system

### Service Structure
```sql
-- Legacy Systems Category
INSERT INTO service_categories (name, description) 
VALUES ('Legacy Systems', 'Services for managing tickets imported from legacy systems');

-- Legacy Tickets Service  
INSERT INTO services (name, description, category_id, is_active, requires_approval)
VALUES ('Legacy Tickets', 'Service for imported legacy tickets', category_id, true, false);
```

## Migration Benefits

### For Administrators
- **Clear Separation**: Legacy tickets don't mix with new tickets
- **Historical Analysis**: Easy to analyze imported data patterns
- **Branch Accuracy**: Proper branch assignment based on requester info
- **Service Consistency**: All legacy tickets use dedicated service

### For Technicians
- **Easy Identification**: Legacy tickets clearly marked in UI
- **Access Control**: Available at `/tickets/legacy` for authorized users
- **Complete Context**: Original ManageEngine data preserved for reference
- **Conversion Capability**: Can convert legacy tickets to regular tickets

### For Users
- **Data Integrity**: No loss of historical ticket information
- **Seamless Experience**: Legacy tickets integrated into overall system
- **Branch Accuracy**: Tickets properly associated with correct branches

## Technical Notes

### Error Handling
- Graceful fallback to default branch if no mapping found
- Automatic service creation if Legacy Tickets service not found
- Comprehensive logging for troubleshooting mapping issues

### Performance
- Efficient caching of branch and service lookups
- Batch processing with configurable delays
- Rate limiting protection for API calls

### Extensibility
- Easy to add new branch mappings in `branchMappings` object
- Configurable service assignment
- Pluggable branch recognition patterns

## Files Modified
1. `scripts/import-manageengine-tickets.js` - Main import logic
2. `scripts/create-legacy-service.js` - Service creation utility
3. `prisma/schema.prisma` - Database schema (LegacyTicket model)
4. Navigation and UI components for legacy ticket management

## Next Steps
1. Monitor import accuracy with verbose logging
2. Add additional branch mappings as needed
3. Train users on legacy ticket management interface
4. Set up reporting for legacy ticket conversion tracking