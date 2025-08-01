const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFieldTemplates() {
  console.log('Testing Field Template System...\n')
  
  try {
    // Test 1: Create a simple field template
    console.log('1. Creating a test field template...')
    const fieldTemplate = await prisma.fieldTemplate.create({
      data: {
        name: 'test_customer_name',
        label: 'Test Customer Name',
        type: 'TEXT',
        category: 'Customer Information',
        isRequired: true,
        isUserVisible: true,
        helpText: 'Enter the customer name',
        order: 1
      }
    })
    console.log('✓ Created field template:', fieldTemplate.label)
    
    // Test 2: Link to a service
    console.log('\n2. Finding a service to link to...')
    const service = await prisma.service.findFirst({
      where: { name: { contains: 'Password' } }
    })
    
    if (service) {
      console.log(`✓ Found service: ${service.name}`)
      
      console.log('\n3. Linking field template to service...')
      const link = await prisma.serviceFieldTemplate.create({
        data: {
          serviceId: service.id,
          fieldTemplateId: fieldTemplate.id,
          order: 1,
          isRequired: true,
          isUserVisible: true
        }
      })
      console.log('✓ Successfully linked field template to service')
      
      // Test 3: Query service with field templates
      console.log('\n4. Querying service with field templates...')
      const serviceWithFields = await prisma.service.findUnique({
        where: { id: service.id },
        include: {
          serviceFieldTemplates: {
            include: {
              fieldTemplate: true
            }
          }
        }
      })
      
      console.log(`✓ Service "${serviceWithFields.name}" has ${serviceWithFields.serviceFieldTemplates.length} field template(s):`)
      serviceWithFields.serviceFieldTemplates.forEach(sft => {
        console.log(`  - ${sft.fieldTemplate.label} (${sft.fieldTemplate.type})`)
      })
      
      // Cleanup
      console.log('\n5. Cleaning up test data...')
      await prisma.serviceFieldTemplate.delete({
        where: { id: link.id }
      })
      await prisma.fieldTemplate.delete({
        where: { id: fieldTemplate.id }
      })
      console.log('✓ Cleanup complete')
    } else {
      console.log('✗ No services found to test with')
    }
    
    // Test 4: Check existing field templates
    console.log('\n6. Checking existing field templates...')
    const existingTemplates = await prisma.fieldTemplate.findMany({
      take: 5,
      include: {
        _count: {
          select: { serviceFieldTemplates: true }
        }
      }
    })
    
    console.log(`Found ${existingTemplates.length} existing field templates:`)
    existingTemplates.forEach(ft => {
      console.log(`  - ${ft.label} (${ft.type}) - Used by ${ft._count.serviceFieldTemplates} service(s)`)
    })
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFieldTemplates()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })