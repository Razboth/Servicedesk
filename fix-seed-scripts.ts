import fs from 'fs';
import path from 'path';

// Function to update seed scripts to use upsert instead of create
function fixSeedScripts() {
  console.log('🔧 Fixing seed scripts to use upsert operations...');

  const seedFiles = [
    'prisma/seed-field-templates.ts',
    'prisma/seed.ts'
  ];

  for (const filePath of seedFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`\n📝 Processing ${filePath}...`);
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // Fix ServiceFieldTemplate.create -> upsert
      const serviceFieldTemplateCreatePattern = /await prisma\.serviceFieldTemplate\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g;
      const serviceFieldTemplateMatches = content.match(serviceFieldTemplateCreatePattern);
      
      if (serviceFieldTemplateMatches) {
        console.log(`  Found ${serviceFieldTemplateMatches.length} ServiceFieldTemplate.create calls`);
        content = content.replace(
          /await prisma\.serviceFieldTemplate\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g,
          (match, dataContent) => {
            // Extract serviceId and fieldTemplateId from the data
            const serviceIdMatch = dataContent.match(/serviceId:\s*([^,\s]+)/);
            const fieldTemplateIdMatch = dataContent.match(/fieldTemplateId:\s*([^,\s]+)/);
            
            if (serviceIdMatch && fieldTemplateIdMatch) {
              const serviceId = serviceIdMatch[1];
              const fieldTemplateId = fieldTemplateIdMatch[1];
              
              return `await prisma.serviceFieldTemplate.upsert({
                    where: {
                      serviceId_fieldTemplateId: {
                        serviceId: ${serviceId},
                        fieldTemplateId: ${fieldTemplateId}
                      }
                    },
                    create: {${dataContent}},
                    update: {${dataContent.replace(/serviceId:\s*[^,\s]+,?\s*/, '').replace(/fieldTemplateId:\s*[^,\s]+,?\s*/, '')}}
                  })`;
            }
            return match; // Return original if we can't parse
          }
        );
        modified = true;
      }

      // Fix ServiceField.create -> upsert  
      const serviceFieldCreatePattern = /await prisma\.serviceField\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g;
      const serviceFieldMatches = content.match(serviceFieldCreatePattern);
      
      if (serviceFieldMatches) {
        console.log(`  Found ${serviceFieldMatches.length} ServiceField.create calls`);
        content = content.replace(
          /await prisma\.serviceField\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g,
          (match, dataContent) => {
            // Extract serviceId and name from the data
            const serviceIdMatch = dataContent.match(/serviceId:\s*([^,\s]+)/);
            const nameMatch = dataContent.match(/name:\s*([^,\s]+)/);
            
            if (serviceIdMatch && nameMatch) {
              const serviceId = serviceIdMatch[1];
              const name = nameMatch[1];
              
              return `await prisma.serviceField.upsert({
                    where: {
                      serviceId_name: {
                        serviceId: ${serviceId},
                        name: ${name}
                      }
                    },
                    create: {${dataContent}},
                    update: {${dataContent.replace(/serviceId:\s*[^,\s]+,?\s*/, '').replace(/name:\s*[^,\s]+,?\s*/, '')}}
                  })`;
            }
            return match; // Return original if we can't parse
          }
        );
        modified = true;
      }

      // Fix FieldTemplate.create -> upsert (if unique field exists)
      const fieldTemplateCreatePattern = /await prisma\.fieldTemplate\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g;
      const fieldTemplateMatches = content.match(fieldTemplateCreatePattern);
      
      if (fieldTemplateMatches) {
        console.log(`  Found ${fieldTemplateMatches.length} FieldTemplate.create calls`);
        content = content.replace(
          /await prisma\.fieldTemplate\.create\(\s*{\s*data:\s*{([^}]+)}\s*}\s*\)/g,
          (match, dataContent) => {
            // Extract name from the data (assuming name is unique)
            const nameMatch = dataContent.match(/name:\s*([^,\s]+)/);
            
            if (nameMatch) {
              const name = nameMatch[1];
              
              return `await prisma.fieldTemplate.upsert({
                    where: { name: ${name} },
                    create: {${dataContent}},
                    update: {${dataContent.replace(/name:\s*[^,\s]+,?\s*/, '')}}
                  })`;
            }
            return match; // Return original if we can't parse
          }
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ Updated ${filePath}`);
      } else {
        console.log(`  ℹ️ No changes needed for ${filePath}`);
      }
    } else {
      console.log(`  ⚠️ File not found: ${filePath}`);
    }
  }

  console.log('\n🎉 Seed script fixes completed!');
}

fixSeedScripts();