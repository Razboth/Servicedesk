const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Common field patterns extracted from import2.csv
const commonFieldTemplates = {
  // Customer Information Fields
  customerInfo: {
    category: 'Customer Information',
    fields: [
      { name: 'customer_name', label: 'Nama Nasabah', type: 'TEXT', isRequired: true },
      { name: 'account_number', label: 'Nomor Rekening', type: 'TEXT', isRequired: true },
      { name: 'card_number', label: 'Nomor Kartu', type: 'TEXT', isRequired: false },
      { name: 'phone_number', label: 'Nomor HP', type: 'PHONE', isRequired: false }
    ]
  },
  
  // ATM Specific Fields
  atmInfo: {
    category: 'ATM Information',
    fields: [
      { name: 'atm_id', label: 'ID ATM', type: 'TEXT', isRequired: true },
      { name: 'atm_location', label: 'Nama/Lokasi ATM', type: 'TEXT', isRequired: true },
      { name: 'serial_number', label: 'SN (Serial Number)', type: 'TEXT', isRequired: false },
      { name: 'machine_type', label: 'Tipe Mesin', type: 'TEXT', isRequired: false },
      { name: 'pic_name', label: 'Nama PIC ATM', type: 'TEXT', isRequired: false },
      { name: 'pic_phone', label: 'No HP PIC', type: 'PHONE', isRequired: false },
      { name: 'error_list', label: 'Daftar Error ATM', type: 'TEXTAREA', isRequired: false }
    ]
  },
  
  // User Account Fields
  userAccount: {
    category: 'User Account',
    fields: [
      { name: 'user_name', label: 'Nama User', type: 'TEXT', isRequired: true },
      { name: 'user_code', label: 'Kode User', type: 'TEXT', isRequired: true },
      { name: 'user_email', label: 'Email User', type: 'EMAIL', isRequired: false },
      { name: 'user_phone', label: 'Nomor HP', type: 'PHONE', isRequired: false },
      { name: 'position', label: 'Jabatan', type: 'TEXT', isRequired: false },
      { name: 'origin_unit', label: 'Asal Instansi', type: 'TEXT', isRequired: false },
      { name: 'transfer_from', label: 'Mutasi Dari', type: 'TEXT', isRequired: false },
      { name: 'transfer_to', label: 'Mutasi Ke', type: 'TEXT', isRequired: false }
    ]
  },
  
  // Transaction Fields
  transactionInfo: {
    category: 'Transaction Information',
    fields: [
      { name: 'transaction_amount', label: 'Nominal Transaksi', type: 'NUMBER', isRequired: true },
      { name: 'transaction_date', label: 'Tanggal Transaksi', type: 'DATETIME', isRequired: true },
      { name: 'transaction_id', label: 'ID Transaksi', type: 'TEXT', isRequired: false },
      { name: 'archive_number', label: 'Nomor Arsip', type: 'TEXT', isRequired: false },
      { name: 'payment_code', label: 'Kode Bayar / ID Pelanggan', type: 'TEXT', isRequired: false }
    ]
  },
  
  // Error Information Fields
  errorInfo: {
    category: 'Error Information',
    fields: [
      { name: 'error_description', label: 'Keterangan Error', type: 'TEXTAREA', isRequired: true },
      { name: 'error_chronology', label: 'Kronologi Terjadi Error', type: 'TEXTAREA', isRequired: false }
    ]
  },
  
  // Location Fields
  locationInfo: {
    category: 'Location Information',
    fields: [
      { name: 'location', label: 'Lokasi', type: 'TEXT', isRequired: true },
      { name: 'complaint', label: 'Keluhan', type: 'TEXTAREA', isRequired: true }
    ]
  },
  
  // Approval Fields
  approvalInfo: {
    category: 'Approval Information',
    fields: [
      { name: 'approval_date', label: 'Tanggal Approve', type: 'DATE', isRequired: false }
    ]
  },
  
  // ATM Reconciliation Fields
  atmReconciliation: {
    category: 'ATM Reconciliation',
    fields: [
      { name: 'atm_list', label: 'Daftar ATM', type: 'TEXTAREA', isRequired: true },
      { name: 'discrepancy_type', label: 'Jenis Selisih', type: 'TEXT', isRequired: true },
      { name: 'reconciliation', label: 'Rekonsiliasi', type: 'TEXT', isRequired: false },
      { name: 'journal_log', label: 'Log Jurnal', type: 'TEXT', isRequired: false },
      { name: 'rc_file', label: 'File RC', type: 'FILE', isRequired: false }
    ]
  }
}

// Service to field mapping based on import2.csv patterns
const serviceFieldMappings = [
  // ATM Services
  { 
    servicePattern: 'ATM Technical Issue', 
    templates: ['atmInfo']
  },
  
  // BSGTouch SMS Activation
  { 
    servicePattern: 'BSGTouch SMS Activation Not Sent', 
    templates: ['approvalInfo']
  },
  
  // Kasda Errors
  { 
    servicePattern: 'Kasda.*Error', 
    templates: ['userAccount', 'transactionInfo', 'errorInfo']
  },
  
  // OLIBs Errors
  { 
    servicePattern: 'OLIBs.*Error', 
    templates: ['errorInfo']
  },
  
  // Transaction Claims
  { 
    servicePattern: '.*Claim', 
    templates: ['customerInfo', 'transactionInfo']
  },
  
  // Network Issues
  { 
    servicePattern: 'Network.*Disruption', 
    templates: ['locationInfo']
  },
  
  // User Management Services
  { 
    servicePattern: '.*User Registration|.*User.*', 
    templates: ['userAccount']
  },
  
  // ATM Reconciliation
  { 
    servicePattern: 'ATM Discrepancy Resolution', 
    templates: ['atmReconciliation']
  }
]

async function seedFieldTemplates() {
  console.log('Starting field template seeding...')
  
  try {
    // Create field templates
    for (const [key, category] of Object.entries(commonFieldTemplates)) {
      console.log(`Creating field templates for category: ${category.category}`)
      
      for (const field of category.fields) {
        try {
          const fieldTemplate = await prisma.fieldTemplate.create({
            data: {
              name: field.name,
              label: field.label,
              type: field.type,
              category: category.category,
              isRequired: field.isRequired,
              helpText: `Enter ${field.label}`,
              isActive: true
            }
          })
          console.log(`  ✓ Created field template: ${field.label}`)
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`  - Field template already exists: ${field.label}`)
          } else {
            throw error
          }
        }
      }
    }
    
    // Now map field templates to services
    console.log('\nMapping field templates to services...')
    
    // Get all services
    const services = await prisma.service.findMany()
    console.log(`Found ${services.length} services to process`)
    
    // Get all field templates we created
    const fieldTemplates = await prisma.fieldTemplate.findMany()
    const templateMap = new Map(fieldTemplates.map(ft => [ft.name, ft]))
    
    for (const service of services) {
      // Find matching field mappings for this service
      const matchingMappings = serviceFieldMappings.filter(mapping => {
        const regex = new RegExp(mapping.servicePattern, 'i')
        return regex.test(service.name)
      })
      
      if (matchingMappings.length > 0) {
        console.log(`\nProcessing service: ${service.name}`)
        let order = 1
        
        for (const mapping of matchingMappings) {
          for (const templateCategory of mapping.templates) {
            const categoryFields = commonFieldTemplates[templateCategory]?.fields || []
            
            for (const field of categoryFields) {
              const fieldTemplate = templateMap.get(field.name)
              if (fieldTemplate) {
                try {
                  await prisma.serviceFieldTemplate.create({
                    data: {
                      serviceId: service.id,
                      fieldTemplateId: fieldTemplate.id,
                      order: order++,
                      isRequired: field.isRequired,
                      isUserVisible: true
                    }
                  })
                  console.log(`  ✓ Linked field: ${field.label}`)
                } catch (error) {
                  if (error.code === 'P2002') {
                    console.log(`  - Field already linked: ${field.label}`)
                  } else {
                    console.error(`  ✗ Error linking field ${field.label}:`, error.message)
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Special handling for import2.csv exact field mappings
    console.log('\nProcessing exact field mappings from import2.csv...')
    await processExactFieldMappings()
    
    console.log('\nField template seeding completed!')
  } catch (error) {
    console.error('Error seeding field templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function processExactFieldMappings() {
  // Read import2.csv
  const csvPath = path.join(process.cwd(), 'import2.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(';')
  
  // Find Field 1-7 column indices
  const fieldIndices = []
  for (let i = 1; i <= 7; i++) {
    const index = headers.findIndex(h => h.trim() === `Field ${i}`)
    if (index !== -1) fieldIndices.push(index)
  }
  
  console.log(`Found ${fieldIndices.length} field columns in CSV`)
  
  // Process each service line
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';')
    const serviceName = values[11]?.trim() // Title column
    
    if (!serviceName) continue
    
    // Get the service
    const service = await prisma.service.findFirst({
      where: { name: serviceName }
    })
    
    if (!service) {
      console.log(`Service not found: ${serviceName}`)
      continue
    }
    
    // Extract fields from this row
    const rowFields = []
    for (const fieldIndex of fieldIndices) {
      const fieldValue = values[fieldIndex]?.trim()
      if (fieldValue) {
        rowFields.push(fieldValue)
      }
    }
    
    if (rowFields.length > 0) {
      console.log(`\nService: ${serviceName} has specific fields:`)
      
      // Get existing linked templates for this service
      const existingLinks = await prisma.serviceFieldTemplate.findMany({
        where: { serviceId: service.id },
        include: { fieldTemplate: true }
      })
      const existingFieldNames = new Set(existingLinks.map(link => link.fieldTemplate.label))
      
      // Get existing service fields
      const existingServiceFields = await prisma.serviceField.findMany({
        where: { serviceId: service.id }
      })
      const existingServiceFieldNames = new Set(existingServiceFields.map(f => f.label))
      
      let order = existingLinks.length + existingServiceFields.length + 1
      
      for (const fieldLabel of rowFields) {
        if (!existingFieldNames.has(fieldLabel) && !existingServiceFieldNames.has(fieldLabel)) {
          // Create a service-specific field if it doesn't match any template
          try {
            const fieldName = fieldLabel.toLowerCase()
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
            
            await prisma.serviceField.create({
              data: {
                serviceId: service.id,
                name: fieldName,
                label: fieldLabel,
                type: guessFieldType(fieldLabel),
                isRequired: false,
                isUserVisible: true,
                helpText: `Enter ${fieldLabel}`,
                order: order++
              }
            })
            console.log(`  ✓ Created service-specific field: ${fieldLabel}`)
          } catch (error) {
            if (error.code === 'P2002') {
              console.log(`  - Service field already exists: ${fieldLabel}`)
            } else {
              console.error(`  ✗ Error creating field ${fieldLabel}:`, error.message)
            }
          }
        } else {
          console.log(`  - Field already exists: ${fieldLabel}`)
        }
      }
    }
  }
}

function guessFieldType(fieldLabel) {
  const label = fieldLabel.toLowerCase()
  
  if (label.includes('email')) return 'EMAIL'
  if (label.includes('phone') || label.includes('hp') || label.includes('telp')) return 'PHONE'
  if (label.includes('tanggal') || label.includes('date')) return 'DATE'
  if (label.includes('nominal') || label.includes('amount')) return 'NUMBER'
  if (label.includes('keterangan') || label.includes('kronologi') || label.includes('daftar')) return 'TEXTAREA'
  if (label.includes('file')) return 'FILE'
  
  return 'TEXT'
}

// Run the seeding
seedFieldTemplates()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })