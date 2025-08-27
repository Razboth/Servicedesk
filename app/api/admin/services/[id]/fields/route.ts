import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const serviceFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'URL', 'TEXTAREA', 'SELECT', 'RADIO', 'CHECKBOX', 'DATE', 'FILE']),
  isRequired: z.boolean().default(false),
  isUserVisible: z.boolean().default(true),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.any().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true)
});

const updateFieldsSchema = z.object({
  fields: z.array(serviceFieldSchema)
});

// PUT /api/admin/services/[id]/fields - Update service fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateFieldsSchema.parse(body);

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Validate field names are unique within the service
    const fieldNames = validatedData.fields.map(f => f.name.toLowerCase());
    const uniqueFieldNames = new Set(fieldNames);
    
    if (fieldNames.length !== uniqueFieldNames.size) {
      return NextResponse.json(
        { error: 'Field names must be unique within a service' },
        { status: 400 }
      );
    }

    // Use transaction to update fields
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing fields
      await tx.serviceField.deleteMany({
        where: { serviceId: id }
      });

      // Create new fields
      const createdFields = [];
      for (const field of validatedData.fields) {
        const createdField = await tx.serviceField.create({
          data: {
            serviceId: id,
            name: field.name,
            label: field.label,
            type: field.type,
            isRequired: field.isRequired,
            isUserVisible: field.isUserVisible,
            placeholder: field.placeholder,
            helpText: field.helpText,
            defaultValue: field.defaultValue,
            options: field.options,
            validation: field.validation,
            order: field.order,
            isActive: field.isActive,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        createdFields.push(createdField);
      }

      // Update service updated timestamp
      await tx.service.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      return createdFields;
    });

    return NextResponse.json({
      message: 'Service fields updated successfully',
      fields: result
    });
  } catch (error) {
    console.error('Error updating service fields:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/services/[id]/fields - Get service fields
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const fields = await prisma.serviceField.findMany({
      where: { serviceId: id },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching service fields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/services/[id]/fields - Add a single field
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = serviceFieldSchema.parse(body);

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if field name already exists for this service
    const existingField = await prisma.serviceField.findFirst({
      where: {
        serviceId: id,
        name: validatedData.name
      }
    });

    if (existingField) {
      return NextResponse.json(
        { error: 'Field with this name already exists for this service' },
        { status: 400 }
      );
    }

    // Get the next order value
    const lastField = await prisma.serviceField.findFirst({
      where: { serviceId: id },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastField ? lastField.order + 1 : 0;

    // Create the field
    const field = await prisma.serviceField.create({
      data: {
        serviceId: id,
        name: validatedData.name,
        label: validatedData.label,
        type: validatedData.type,
        isRequired: validatedData.isRequired,
        isUserVisible: validatedData.isUserVisible,
        placeholder: validatedData.placeholder,
        helpText: validatedData.helpText,
        defaultValue: validatedData.defaultValue,
        options: validatedData.options,
        validation: validatedData.validation,
        order: validatedData.order || nextOrder,
        isActive: validatedData.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update service updated timestamp
    await prisma.service.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error('Error creating service field:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}