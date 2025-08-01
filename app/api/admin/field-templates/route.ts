import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || undefined;
    const fieldType = searchParams.get('fieldType') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (fieldType && fieldType !== 'all') {
      where.type = fieldType;
    }

    const [fieldTemplates, total] = await Promise.all([
      prisma.fieldTemplate.findMany({
        where,
        include: {
          _count: {
            select: { serviceFieldTemplates: true }
          }
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.fieldTemplate.count({ where })
    ]);

    // Return array directly for backward compatibility
    if (!searchParams.has('page')) {
      return NextResponse.json(fieldTemplates);
    }

    // Return with pagination if requested
    return NextResponse.json({
      templates: fieldTemplates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching field templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    const { name, label, type } = body;
    if (!name || !label || !type) {
      return NextResponse.json(
        { error: 'Name, label, and type are required' },
        { status: 400 }
      );
    }

    // Check if template with same name already exists
    const existing = await prisma.fieldTemplate.findFirst({
      where: { name }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Field template with this name already exists' },
        { status: 400 }
      );
    }

    // Prepare data
    const data: any = {
      name,
      label,
      type,
      description: body.description,
      isRequired: body.isRequired || false,
      placeholder: body.placeholder,
      helpText: body.helpText,
      defaultValue: body.defaultValue,
      category: body.category
    };

    // Handle options for select/radio/checkbox fields
    if (['SELECT', 'MULTISELECT', 'RADIO'].includes(type)) {
      if (body.options) {
        // Convert options to JSON format
        if (typeof body.options === 'string') {
          data.options = body.options.split('\n').filter((opt: string) => opt.trim());
        } else if (Array.isArray(body.options)) {
          data.options = body.options;
        } else {
          data.options = body.options;
        }
      }
    }

    // Handle validation rules
    if (body.validation) {
      data.validation = body.validation;
    }

    const fieldTemplate = await prisma.fieldTemplate.create({
      data,
      include: {
        _count: {
          select: {
            serviceFieldTemplates: true
          }
        }
      }
    });

    return NextResponse.json(fieldTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating field template:', error);
    return NextResponse.json(
      { error: 'Failed to create field template' },
      { status: 500 }
    );
  }
}