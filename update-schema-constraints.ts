import fs from 'fs'
import path from 'path'

// Update schema file to add unique constraints for idempotent seeding
function updateSchemaConstraints() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  let content = fs.readFileSync(schemaPath, 'utf-8')
  
  console.log('Updating Prisma schema with unique constraints...')
  
  // Add unique constraint to ServiceCategory (name, level)
  content = content.replace(
    /(\s+services\s+Service\[\]\s*\n)\s*(\n\s+@@map\("service_categories"\))/,
    '$1  @@unique([name, level])$2'
  )
  
  // Add unique constraint to Category (name)
  content = content.replace(
    /(model Category {\s*\n\s+id\s+String\s+@id @default\(cuid\(\)\)\s*\n\s+name\s+String)/,
    '$1   @unique'
  )
  
  // Add unique constraint to Subcategory (categoryId, name)
  content = content.replace(
    /(\s+services\s+Service\[\]\s*\n)\s*(\n\s+@@map\("subcategories"\))/,
    '$1  @@unique([categoryId, name])$2'
  )
  
  // Add unique constraint to Item (subcategoryId, name)
  content = content.replace(
    /(\s+services\s+Service\[\]\s*\n)\s*(\n\s+@@map\("items"\))/,
    '$1  @@unique([subcategoryId, name])$2'
  )
  
  // Add unique constraint to FieldTemplate (name)
  content = content.replace(
    /(model FieldTemplate {\s*\n\s+id\s+String\s+@id @default\(cuid\(\)\)\s*\n\s+name\s+String)/,
    '$1   @unique'
  )
  
  // Add unique constraint to SupportGroup (name)
  content = content.replace(
    /(model SupportGroup {\s*\n\s+id\s+String\s+@id @default\(cuid\(\)\)\s*\n\s+name\s+String)/,
    '$1    @unique'
  )
  
  // Write updated schema
  fs.writeFileSync(schemaPath, content)
  console.log('Schema updated successfully!')
  
  // Generate instructions for manual migration
  console.log('\nTo apply these changes to your database:')
  console.log('1. Run: npx prisma migrate dev --name add-unique-constraints')
  console.log('2. Or apply manually with: psql -U postgres -d servicedesk_database -f prisma/add-unique-constraints.sql')
}

updateSchemaConstraints()