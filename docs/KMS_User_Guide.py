#!/usr/bin/env python3
"""
KMS (Knowledge Management System) - Complete User Guide PDF Generator
Bank SulutGo ServiceDesk
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from datetime import datetime
import os

# Colors
PRIMARY_COLOR = HexColor('#1e40af')  # Blue
SECONDARY_COLOR = HexColor('#059669')  # Green
ACCENT_COLOR = HexColor('#dc2626')  # Red
HEADER_BG = HexColor('#1e3a5f')
LIGHT_BG = HexColor('#f8fafc')
BORDER_COLOR = HexColor('#e2e8f0')

def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()

    # Title style
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))

    # Subtitle
    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=HexColor('#64748b'),
        spaceAfter=20,
        alignment=TA_CENTER
    ))

    # Chapter heading
    styles.add(ParagraphStyle(
        name='ChapterHeading',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=15,
        fontName='Helvetica-Bold',
        borderPadding=(10, 10, 10, 10),
        borderColor=PRIMARY_COLOR,
        borderWidth=0,
        leftIndent=0
    ))

    # Section heading
    styles.add(ParagraphStyle(
        name='SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#1e3a5f'),
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    ))

    # Subsection heading
    styles.add(ParagraphStyle(
        name='SubsectionHeading',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=HexColor('#334155'),
        spaceBefore=10,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))

    # Body text (override existing)
    styles['BodyText'].fontSize = 11
    styles['BodyText'].textColor = HexColor('#1e293b')
    styles['BodyText'].spaceAfter = 8
    styles['BodyText'].alignment = TA_JUSTIFY
    styles['BodyText'].leading = 16

    # Note/Info box
    styles.add(ParagraphStyle(
        name='NoteText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#1e40af'),
        spaceAfter=8,
        leftIndent=20,
        rightIndent=20,
        backColor=HexColor('#eff6ff'),
        borderPadding=10
    ))

    # Warning box
    styles.add(ParagraphStyle(
        name='WarningText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#b45309'),
        spaceAfter=8,
        leftIndent=20,
        rightIndent=20
    ))

    # Code/Technical
    styles.add(ParagraphStyle(
        name='CodeText',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Courier',
        textColor=HexColor('#1e293b'),
        backColor=HexColor('#f1f5f9'),
        spaceAfter=8,
        leftIndent=10,
        rightIndent=10
    ))

    # Table of contents
    styles.add(ParagraphStyle(
        name='TOCEntry',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#1e293b'),
        spaceAfter=6,
        leftIndent=0
    ))

    styles.add(ParagraphStyle(
        name='TOCSubEntry',
        parent=styles['Normal'],
        fontSize=11,
        textColor=HexColor('#475569'),
        spaceAfter=4,
        leftIndent=20
    ))

    return styles

def add_header_footer(canvas, doc):
    """Add header and footer to each page"""
    canvas.saveState()

    # Header
    canvas.setFillColor(HEADER_BG)
    canvas.rect(0, A4[1] - 50, A4[0], 50, fill=True, stroke=False)
    canvas.setFillColor(white)
    canvas.setFont('Helvetica-Bold', 12)
    canvas.drawString(50, A4[1] - 32, "KMS User Guide - Bank SulutGo ServiceDesk")

    # Footer
    canvas.setFillColor(HexColor('#64748b'))
    canvas.setFont('Helvetica', 9)
    canvas.drawString(50, 30, f"Generated: {datetime.now().strftime('%d %B %Y')}")
    canvas.drawRightString(A4[0] - 50, 30, f"Page {doc.page}")

    # Footer line
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.line(50, 45, A4[0] - 50, 45)

    canvas.restoreState()

def create_cover_page(styles):
    """Create cover page elements"""
    elements = []

    elements.append(Spacer(1, 2*inch))

    # Main title
    elements.append(Paragraph(
        "Knowledge Management System",
        styles['CustomTitle']
    ))

    elements.append(Paragraph(
        "(KMS)",
        ParagraphStyle(
            name='TitleAbbr',
            fontSize=24,
            textColor=PRIMARY_COLOR,
            alignment=TA_CENTER,
            spaceAfter=20
        )
    ))

    elements.append(Spacer(1, 0.5*inch))

    elements.append(Paragraph(
        "Complete User Guide & Flow Documentation",
        styles['Subtitle']
    ))

    elements.append(Spacer(1, 1*inch))

    # Info box
    info_data = [
        ['Document Type:', 'User Guide & Technical Reference'],
        ['System:', 'Bank SulutGo ServiceDesk'],
        ['Version:', '2.0'],
        ['Date:', datetime.now().strftime('%d %B %Y')],
        ['Classification:', 'Internal Use']
    ]

    info_table = Table(info_data, colWidths=[2*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (-1, -1), HexColor('#1e293b')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (0, -1), 15),
    ]))
    elements.append(info_table)

    elements.append(PageBreak())
    return elements

def create_toc(styles):
    """Create table of contents"""
    elements = []

    elements.append(Paragraph("Table of Contents", styles['ChapterHeading']))
    elements.append(Spacer(1, 20))

    toc_items = [
        ("1. Introduction & Overview", [
            "1.1 About KMS",
            "1.2 Key Features",
            "1.3 User Roles & Permissions"
        ]),
        ("2. Article Management", [
            "2.1 Creating Articles",
            "2.2 Editing Articles",
            "2.3 Article Status Workflow",
            "2.4 Publishing Articles"
        ]),
        ("3. File & Attachment Management", [
            "3.1 Uploading Files",
            "3.2 Downloading Files",
            "3.3 File Restrictions & Limits"
        ]),
        ("4. Version Control", [
            "4.1 Version History",
            "4.2 Comparing Versions",
            "4.3 Restoring Versions",
            "4.4 Marking Stable Versions"
        ]),
        ("5. Access Control & Visibility", [
            "5.1 Visibility Levels",
            "5.2 Role-Based Access",
            "5.3 Branch-Based Access",
            "5.4 Private Articles"
        ]),
        ("6. Collaboration Features", [
            "6.1 Adding Collaborators",
            "6.2 Collaborator Roles",
            "6.3 Time-Limited Access"
        ]),
        ("7. Comments & Feedback", [
            "7.1 Adding Comments",
            "7.2 Threaded Replies",
            "7.3 Helpful/Not Helpful Feedback"
        ]),
        ("8. Content Governance", [
            "8.1 Review Cycles",
            "8.2 Stale Content Management",
            "8.3 Ownership Transfer"
        ]),
        ("9. Analytics & Reporting", [
            "9.1 Access Logs",
            "9.2 Analytics Dashboard",
            "9.3 Search Analytics"
        ]),
        ("10. User Flow Scenarios", [
            "10.1 Technician Flow",
            "10.2 Manager Flow",
            "10.3 End User Flow",
            "10.4 Admin Flow"
        ])
    ]

    for chapter, sections in toc_items:
        elements.append(Paragraph(chapter, styles['TOCEntry']))
        for section in sections:
            elements.append(Paragraph(section, styles['TOCSubEntry']))

    elements.append(PageBreak())
    return elements

def create_chapter_1(styles):
    """Chapter 1: Introduction & Overview"""
    elements = []

    elements.append(Paragraph("1. Introduction & Overview", styles['ChapterHeading']))

    # 1.1 About KMS
    elements.append(Paragraph("1.1 About KMS", styles['SectionHeading']))
    elements.append(Paragraph(
        """The Knowledge Management System (KMS) is an integrated component of Bank SulutGo's
        ServiceDesk platform, designed to centralize, organize, and share institutional knowledge
        across the organization. KMS enables teams to create, review, and maintain documentation
        with enterprise-grade features including version control, access management, and comprehensive analytics.""",
        styles['BodyText']
    ))

    # 1.2 Key Features
    elements.append(Paragraph("1.2 Key Features", styles['SectionHeading']))

    features = [
        "<b>Article Management:</b> Create, edit, and publish knowledge articles with rich content support",
        "<b>File Attachments:</b> Upload and manage documents, images, and supporting files",
        "<b>Version Control:</b> Track changes, compare versions, and restore previous states",
        "<b>Access Control:</b> Fine-grained visibility settings based on roles, branches, or individuals",
        "<b>Collaboration:</b> Invite collaborators with specific permissions and time-limited access",
        "<b>Review Workflow:</b> Built-in approval process with draft, review, and publish states",
        "<b>Content Governance:</b> Automated stale content detection and review cycle management",
        "<b>Analytics:</b> Comprehensive access logs, usage metrics, and search analytics",
        "<b>Comments & Feedback:</b> Threaded discussions and helpful/not-helpful voting"
    ]

    for feature in features:
        elements.append(Paragraph(f"• {feature}", styles['BodyText']))

    elements.append(Spacer(1, 15))

    # 1.3 User Roles
    elements.append(Paragraph("1.3 User Roles & Permissions", styles['SectionHeading']))
    elements.append(Paragraph(
        "The KMS implements role-based access control (RBAC) with the following roles:",
        styles['BodyText']
    ))

    role_data = [
        ['Role', 'Description', 'KMS Permissions'],
        ['USER', 'Standard end-user', 'View published articles, search, comment, provide feedback'],
        ['TECHNICIAN', 'IT Support staff', 'Create articles, edit own articles, upload files, manage collaborators'],
        ['MANAGER', 'Department manager', 'Full access to all articles, manage visibility, bulk operations'],
        ['ADMIN', 'System administrator', 'Complete system access, analytics, templates, governance']
    ]

    role_table = Table(role_data, colWidths=[1.2*inch, 1.5*inch, 3.3*inch])
    role_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 1), (-1, -1), white),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(role_table)

    elements.append(Spacer(1, 15))

    # Permission Matrix
    elements.append(Paragraph("Permission Matrix by Role:", styles['SubsectionHeading']))

    perm_data = [
        ['Feature', 'USER', 'TECHNICIAN', 'MANAGER', 'ADMIN'],
        ['View Published Articles', '✓', '✓', '✓', '✓'],
        ['Search & Filter', '✓', '✓', '✓', '✓'],
        ['Add Comments', '✓', '✓', '✓', '✓'],
        ['Provide Feedback', '✓', '✓', '✓', '✓'],
        ['Download Attachments', '✓', '✓', '✓', '✓'],
        ['Create Articles', '✗', '✓', '✓', '✓'],
        ['Edit Own Articles', '✗', '✓', '✓', '✓'],
        ['Edit Others\' Articles', '✗', '✗', '✓', '✓'],
        ['Upload Attachments', '✗', '✓', '✓', '✓'],
        ['Manage Collaborators', '✗', 'Own Only', '✓', '✓'],
        ['View Drafts', '✗', 'Own Only', '✓', '✓'],
        ['Delete Articles', '✗', 'Own Only', '✓', '✓'],
        ['View Access Logs', '✗', 'Limited', '✓', '✓'],
        ['Manage Visibility', '✗', 'Own Only', '✓', '✓'],
        ['Bulk Operations', '✗', '✗', '✓', '✓'],
        ['Analytics Dashboard', '✗', '✗', '✓', '✓'],
        ['Permission Templates', '✗', '✗', '✗', '✓']
    ]

    perm_table = Table(perm_data, colWidths=[2.2*inch, 0.9*inch, 1.1*inch, 1*inch, 0.8*inch])
    perm_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(perm_table)

    elements.append(PageBreak())
    return elements

def create_chapter_2(styles):
    """Chapter 2: Article Management"""
    elements = []

    elements.append(Paragraph("2. Article Management", styles['ChapterHeading']))

    # 2.1 Creating Articles
    elements.append(Paragraph("2.1 Creating Articles", styles['SectionHeading']))
    elements.append(Paragraph(
        "Articles are the core content units in KMS. Only users with TECHNICIAN role or higher can create articles.",
        styles['BodyText']
    ))

    elements.append(Paragraph("Required Fields:", styles['SubsectionHeading']))
    req_fields = [
        "<b>Title</b> - Article title (1-200 characters)",
        "<b>Content</b> - Main article body (minimum 1 character)"
    ]
    for field in req_fields:
        elements.append(Paragraph(f"• {field}", styles['BodyText']))

    elements.append(Paragraph("Optional Fields:", styles['SubsectionHeading']))
    opt_fields = [
        "<b>Summary</b> - Brief description for search results",
        "<b>Category/Subcategory/Item</b> - Service catalog hierarchy for organization",
        "<b>Tags</b> - Keywords for improved searchability",
        "<b>Expiry Date</b> - Auto-archive date for time-sensitive content",
        "<b>Visibility</b> - Access control settings (see Chapter 5)"
    ]
    for field in opt_fields:
        elements.append(Paragraph(f"• {field}", styles['BodyText']))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        "<b>Note:</b> When an article is created, Version 1 is automatically generated with 'Initial version' as the change notes.",
        styles['NoteText']
    ))

    # 2.2 Editing Articles
    elements.append(Paragraph("2.2 Editing Articles", styles['SectionHeading']))
    elements.append(Paragraph(
        """Articles can be edited by the author, collaborators with EDITOR role, managers, and admins.
        When content fields (title, content, or summary) are modified, a new version is automatically created.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Edit Permissions:", styles['SubsectionHeading']))
    edit_perms = [
        "Authors can always edit their own articles",
        "Collaborators with EDITOR or OWNER role can edit",
        "Managers and Admins can edit any article"
    ]
    for perm in edit_perms:
        elements.append(Paragraph(f"• {perm}", styles['BodyText']))

    # 2.3 Status Workflow
    elements.append(Paragraph("2.3 Article Status Workflow", styles['SectionHeading']))
    elements.append(Paragraph(
        "Articles follow a defined workflow from creation to publication:",
        styles['BodyText']
    ))

    status_data = [
        ['Status', 'Description', 'Visible To'],
        ['DRAFT', 'Work in progress, not ready for review', 'Author, Collaborators, Managers, Admins'],
        ['UNDER_REVIEW', 'Submitted for review/approval', 'Author, Collaborators, Managers, Admins'],
        ['PUBLISHED', 'Approved and visible to target audience', 'Based on visibility settings'],
        ['ARCHIVED', 'Deprecated or soft-deleted content', 'Managers, Admins only']
    ]

    status_table = Table(status_data, colWidths=[1.3*inch, 2.2*inch, 2.5*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(status_table)

    elements.append(Spacer(1, 15))

    # Workflow diagram as text
    elements.append(Paragraph("Workflow Flow:", styles['SubsectionHeading']))
    elements.append(Paragraph(
        "DRAFT → UNDER_REVIEW → PUBLISHED → (Optional) ARCHIVED",
        styles['CodeText']
    ))

    # 2.4 Publishing
    elements.append(Paragraph("2.4 Publishing Articles", styles['SectionHeading']))
    elements.append(Paragraph(
        """When an article is published, the system automatically sets the publishedAt timestamp.
        The article then becomes visible according to its visibility settings.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Publishing Checklist:", styles['SubsectionHeading']))
    pub_checks = [
        "Content is complete and reviewed",
        "Appropriate category/tags assigned",
        "Visibility settings configured correctly",
        "Attachments are uploaded (if needed)",
        "Collaborators have been notified"
    ]
    for check in pub_checks:
        elements.append(Paragraph(f"☐ {check}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_3(styles):
    """Chapter 3: File & Attachment Management"""
    elements = []

    elements.append(Paragraph("3. File & Attachment Management", styles['ChapterHeading']))

    # 3.1 Uploading Files
    elements.append(Paragraph("3.1 Uploading Files", styles['SectionHeading']))
    elements.append(Paragraph(
        """Files can be attached to articles to provide supporting documentation, images, or reference materials.
        Only authorized users (authors, collaborators with edit rights, managers, admins) can upload files.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Upload Process:", styles['SubsectionHeading']))
    upload_steps = [
        "Navigate to the article you want to add attachments to",
        "Click 'Add Attachment' or use the attachment section",
        "Select file from your device",
        "System validates file type and size",
        "File is uploaded and saved with metadata",
        "Attachment appears in the article's attachment list"
    ]
    for i, step in enumerate(upload_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    # 3.2 Downloading Files
    elements.append(Paragraph("3.2 Downloading Files", styles['SectionHeading']))
    elements.append(Paragraph(
        """Files can be downloaded by any user who has access to view the article.
        Downloads are tracked in the access logs for analytics and audit purposes.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Download Process:", styles['SubsectionHeading']))
    download_steps = [
        "View the article containing the attachment",
        "Locate the attachment in the attachments section",
        "Click the download button/link",
        "System verifies user has access to the article",
        "File is served with original filename",
        "Download is logged as accessType: DOWNLOAD"
    ]
    for i, step in enumerate(download_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    # 3.3 Restrictions
    elements.append(Paragraph("3.3 File Restrictions & Limits", styles['SectionHeading']))

    restrictions_data = [
        ['Restriction', 'Value'],
        ['Maximum File Size', '10 MB per file'],
        ['Allowed Document Types', 'PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx)'],
        ['Allowed Image Types', 'JPEG, PNG, GIF'],
        ['Allowed Text Types', 'Plain Text (.txt), Markdown (.md)'],
        ['Storage Location', 'Server: uploads/knowledge/{articleId}/'],
        ['Filename Format', 'timestamp-originalname (for uniqueness)']
    ]

    rest_table = Table(restrictions_data, colWidths=[2*inch, 4*inch])
    rest_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(rest_table)

    elements.append(Spacer(1, 15))
    elements.append(Paragraph(
        "<b>Warning:</b> Executable files (.exe, .bat, .sh) and other potentially dangerous file types are not allowed for security reasons.",
        styles['WarningText']
    ))

    elements.append(PageBreak())
    return elements

def create_chapter_4(styles):
    """Chapter 4: Version Control"""
    elements = []

    elements.append(Paragraph("4. Version Control", styles['ChapterHeading']))

    elements.append(Paragraph(
        """KMS maintains a complete version history for all articles, allowing users to track changes,
        compare versions, and restore previous states when needed.""",
        styles['BodyText']
    ))

    # 4.1 Version History
    elements.append(Paragraph("4.1 Version History", styles['SectionHeading']))
    elements.append(Paragraph(
        "Every article maintains a sequential version history. A new version is created when:",
        styles['BodyText']
    ))

    version_triggers = [
        "Article is first created (Version 1)",
        "Title is modified",
        "Content is modified",
        "Summary is modified",
        "A previous version is restored"
    ]
    for trigger in version_triggers:
        elements.append(Paragraph(f"• {trigger}", styles['BodyText']))

    elements.append(Paragraph(
        "<b>Note:</b> Metadata changes (status, visibility, tags) do not create new versions but are logged in the activity timeline.",
        styles['NoteText']
    ))

    elements.append(Paragraph("Version Information Stored:", styles['SubsectionHeading']))
    version_fields = [
        "<b>Version Number</b> - Sequential integer starting from 1",
        "<b>Title</b> - Article title at that version",
        "<b>Content</b> - Full article content",
        "<b>Summary</b> - Article summary",
        "<b>Change Notes</b> - Description of what changed (auto-generated or user-provided)",
        "<b>Author</b> - User who made the changes",
        "<b>Created At</b> - Timestamp of version creation",
        "<b>Is Stable</b> - Whether this version is marked as approved/stable",
        "<b>Approved By/At</b> - Who approved and when (if marked stable)"
    ]
    for field in version_fields:
        elements.append(Paragraph(f"• {field}", styles['BodyText']))

    # 4.2 Comparing Versions
    elements.append(Paragraph("4.2 Comparing Versions", styles['SectionHeading']))
    elements.append(Paragraph(
        """The version comparison feature uses a diff algorithm to show changes between any two versions.
        This helps reviewers understand what was modified.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Diff Display:", styles['SubsectionHeading']))
    diff_info = [
        "<font color='green'>+ Added lines</font> - New content in the newer version",
        "<font color='red'>- Removed lines</font> - Content deleted from the older version",
        "Unchanged lines - Content that remains the same",
        "Title/Summary changes shown separately if modified"
    ]
    for info in diff_info:
        elements.append(Paragraph(f"• {info}", styles['BodyText']))

    # 4.3 Restoring Versions
    elements.append(Paragraph("4.3 Restoring Versions", styles['SectionHeading']))
    elements.append(Paragraph(
        """Any previous version can be restored, which replaces the current article content with
        the selected version's content. The restore operation creates a new version to maintain history.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Restore Process:", styles['SubsectionHeading']))
    restore_steps = [
        "View the version history for an article",
        "Select the version you want to restore",
        "Click 'Restore' and confirm the action",
        "System creates a new version (e.g., 'Restored from version 3')",
        "Article content is updated to match the restored version",
        "Activity is logged in the article timeline"
    ]
    for i, step in enumerate(restore_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    # 4.4 Marking Stable
    elements.append(Paragraph("4.4 Marking Stable Versions", styles['SectionHeading']))
    elements.append(Paragraph(
        """The 'stable' designation identifies approved/verified versions. Only one version per article
        can be marked as stable at a time. When a new version is marked stable, the previous stable
        version is automatically unmarked.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Stable Version Benefits:", styles['SubsectionHeading']))
    stable_benefits = [
        "Clearly identifies approved content",
        "Records who approved and when",
        "Provides a rollback point if issues arise",
        "Supports approval workflows"
    ]
    for benefit in stable_benefits:
        elements.append(Paragraph(f"• {benefit}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_5(styles):
    """Chapter 5: Access Control & Visibility"""
    elements = []

    elements.append(Paragraph("5. Access Control & Visibility", styles['ChapterHeading']))

    elements.append(Paragraph(
        """KMS provides flexible visibility controls to ensure articles reach the right audience
        while protecting sensitive information.""",
        styles['BodyText']
    ))

    # 5.1 Visibility Levels
    elements.append(Paragraph("5.1 Visibility Levels", styles['SectionHeading']))

    vis_data = [
        ['Level', 'Icon', 'Description', 'Who Can Access'],
        ['EVERYONE', '🌐', 'Public to all authenticated users', 'All logged-in users'],
        ['BY_ROLE', '👥', 'Limited to specific roles', 'Users with matching roles'],
        ['BY_BRANCH', '🏢', 'Limited to specific branches', 'Users in specified branches'],
        ['PRIVATE', '🔒', 'Restricted access', 'Author and collaborators only']
    ]

    vis_table = Table(vis_data, colWidths=[1.1*inch, 0.5*inch, 2*inch, 2.4*inch])
    vis_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(vis_table)

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        "<b>Note:</b> Admins and Super Admins bypass all visibility checks and can access any article.",
        styles['NoteText']
    ))

    # 5.2 Role-Based Access
    elements.append(Paragraph("5.2 Role-Based Access (BY_ROLE)", styles['SectionHeading']))
    elements.append(Paragraph(
        "When visibility is set to BY_ROLE, you specify which roles can view the article:",
        styles['BodyText']
    ))

    roles_available = [
        "<b>USER</b> - Standard end users",
        "<b>TECHNICIAN</b> - IT support staff",
        "<b>MANAGER</b> - Department managers",
        "<b>MANAGER_IT</b> - IT department managers",
        "<b>ADMIN</b> - System administrators",
        "<b>SECURITY_ANALYST</b> - Security team members"
    ]
    for role in roles_available:
        elements.append(Paragraph(f"• {role}", styles['BodyText']))

    elements.append(Paragraph(
        "Example: An article visible to TECHNICIAN and MANAGER roles will only appear for users with those specific roles.",
        styles['BodyText']
    ))

    # 5.3 Branch-Based Access
    elements.append(Paragraph("5.3 Branch-Based Access (BY_BRANCH)", styles['SectionHeading']))
    elements.append(Paragraph(
        """When visibility is set to BY_BRANCH, you select specific branch offices that can access the article.
        Users are matched based on their assigned branchId in the system.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Use Cases:", styles['SubsectionHeading']))
    branch_uses = [
        "Branch-specific procedures or policies",
        "Regional operational guides",
        "Location-specific troubleshooting",
        "Local announcement and updates"
    ]
    for use in branch_uses:
        elements.append(Paragraph(f"• {use}", styles['BodyText']))

    # 5.4 Private Articles
    elements.append(Paragraph("5.4 Private Articles", styles['SectionHeading']))
    elements.append(Paragraph(
        """Private articles are only accessible to the author and explicitly added collaborators.
        This is useful for work-in-progress documents or sensitive information.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Who Can Access Private Articles:", styles['SubsectionHeading']))
    private_access = [
        "The article author (always)",
        "Collaborators with VIEWER, EDITOR, or OWNER role",
        "Managers and Admins (override capability)"
    ]
    for access in private_access:
        elements.append(Paragraph(f"• {access}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_6(styles):
    """Chapter 6: Collaboration Features"""
    elements = []

    elements.append(Paragraph("6. Collaboration Features", styles['ChapterHeading']))

    # 6.1 Adding Collaborators
    elements.append(Paragraph("6.1 Adding Collaborators", styles['SectionHeading']))
    elements.append(Paragraph(
        """Article authors can invite other users to collaborate on their articles.
        Collaborators receive specific permissions based on their assigned role.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("How to Add Collaborators:", styles['SubsectionHeading']))
    add_steps = [
        "Open the article you authored",
        "Navigate to the Collaborators section",
        "Click 'Add Collaborator'",
        "Search for and select the user",
        "Choose their role (VIEWER, EDITOR, OWNER)",
        "Optionally set an expiry date for access",
        "Click 'Add' to invite them"
    ]
    for i, step in enumerate(add_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    # 6.2 Collaborator Roles
    elements.append(Paragraph("6.2 Collaborator Roles", styles['SectionHeading']))

    collab_roles = [
        ['Role', 'Permissions'],
        ['VIEWER', '• View the article (including drafts)\n• Add comments\n• Download attachments'],
        ['EDITOR', '• All VIEWER permissions\n• Edit article content\n• Upload attachments\n• Add other collaborators'],
        ['OWNER', '• All EDITOR permissions\n• Remove collaborators\n• Change visibility settings\n• Transfer ownership']
    ]

    collab_table = Table(collab_roles, colWidths=[1.2*inch, 4.8*inch])
    collab_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(collab_table)

    # 6.3 Time-Limited Access
    elements.append(Paragraph("6.3 Time-Limited Access", styles['SectionHeading']))
    elements.append(Paragraph(
        """Collaborator access can be set to expire after a specific date. This is useful for:""",
        styles['BodyText']
    ))

    time_uses = [
        "Temporary project team members",
        "External consultants or contractors",
        "Time-sensitive review processes",
        "Audit or compliance requirements"
    ]
    for use in time_uses:
        elements.append(Paragraph(f"• {use}", styles['BodyText']))

    elements.append(Paragraph(
        "When access expires, the collaborator can no longer view or edit the article, but their previous contributions (comments, edits) remain.",
        styles['BodyText']
    ))

    elements.append(PageBreak())
    return elements

def create_chapter_7(styles):
    """Chapter 7: Comments & Feedback"""
    elements = []

    elements.append(Paragraph("7. Comments & Feedback", styles['ChapterHeading']))

    # 7.1 Adding Comments
    elements.append(Paragraph("7.1 Adding Comments", styles['SectionHeading']))
    elements.append(Paragraph(
        """All users with access to an article can add comments to provide feedback, ask questions,
        or share additional information. Comments support threaded replies for organized discussions.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Comment Features:", styles['SubsectionHeading']))
    comment_features = [
        "Maximum 2000 characters per comment",
        "File attachments supported (same restrictions as article attachments)",
        "Comments can be marked as resolved",
        "Author name, role, and timestamp displayed",
        "Nested replies for threaded conversations"
    ]
    for feature in comment_features:
        elements.append(Paragraph(f"• {feature}", styles['BodyText']))

    # 7.2 Threaded Replies
    elements.append(Paragraph("7.2 Threaded Replies", styles['SectionHeading']))
    elements.append(Paragraph(
        """Comments can have replies, creating threaded conversations. This keeps discussions organized
        and makes it easy to follow specific topics within an article's comment section.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Thread Structure:", styles['SubsectionHeading']))
    elements.append(Paragraph(
        """Comment (Parent)
  └── Reply 1
  └── Reply 2
  └── Reply 3""",
        styles['CodeText']
    ))

    # 7.3 Feedback
    elements.append(Paragraph("7.3 Helpful/Not Helpful Feedback", styles['SectionHeading']))
    elements.append(Paragraph(
        """Users can provide quick feedback on articles using the Helpful/Not Helpful buttons.
        This helps identify valuable content and areas for improvement.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Feedback Rules:", styles['SubsectionHeading']))
    feedback_rules = [
        "One vote per user per article",
        "Users can change their vote",
        "Feedback counts (helpful/notHelpful) stored on article",
        "Helpful rate calculated: helpful ÷ (helpful + notHelpful) × 100%",
        "Feedback analytics available in dashboard"
    ]
    for rule in feedback_rules:
        elements.append(Paragraph(f"• {rule}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_8(styles):
    """Chapter 8: Content Governance"""
    elements = []

    elements.append(Paragraph("8. Content Governance", styles['ChapterHeading']))

    elements.append(Paragraph(
        """KMS includes built-in content governance features to ensure knowledge stays accurate,
        up-to-date, and properly maintained over time.""",
        styles['BodyText']
    ))

    # 8.1 Review Cycles
    elements.append(Paragraph("8.1 Review Cycles", styles['SectionHeading']))
    elements.append(Paragraph(
        """Articles can be assigned a review frequency (default: 90 days). The system tracks when
        articles are due for review and flags overdue content.""",
        styles['BodyText']
    ))

    review_fields = [
        "<b>reviewFrequencyDays</b> - How often article should be reviewed (e.g., 30, 60, 90 days)",
        "<b>nextReviewDate</b> - Calculated date for next review",
        "<b>lastReviewedAt</b> - When article was last reviewed",
        "<b>lastReviewedBy</b> - Who performed the last review"
    ]
    for field in review_fields:
        elements.append(Paragraph(f"• {field}", styles['BodyText']))

    elements.append(Paragraph("Review Process:", styles['SubsectionHeading']))
    review_steps = [
        "Article reaches its nextReviewDate",
        "Article appears in the 'Needs Review' queue",
        "Reviewer checks content for accuracy and relevance",
        "Reviewer clicks 'Mark as Reviewed'",
        "System clears stale flag and calculates next review date",
        "Review activity logged in article timeline"
    ]
    for i, step in enumerate(review_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    # 8.2 Stale Content
    elements.append(Paragraph("8.2 Stale Content Management", styles['SectionHeading']))
    elements.append(Paragraph(
        """Articles past their review date are flagged as 'stale'. The analytics dashboard shows
        stale content organized by urgency level.""",
        styles['BodyText']
    ))

    urgency_data = [
        ['Urgency', 'Criteria', 'Action Required'],
        ['CRITICAL', 'Overdue >30 days OR explicitly marked stale', 'Immediate review needed'],
        ['HIGH', 'Overdue 14-30 days', 'Review within this week'],
        ['MEDIUM', 'Overdue 7-14 days', 'Schedule review soon'],
        ['LOW', 'Upcoming review (within 7 days)', 'Plan for upcoming review']
    ]

    urgency_table = Table(urgency_data, colWidths=[1.1*inch, 2.4*inch, 2.5*inch])
    urgency_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, 1), HexColor('#fee2e2')),  # Red tint for critical
        ('BACKGROUND', (0, 2), (-1, 2), HexColor('#fef3c7')),  # Yellow tint for high
        ('BACKGROUND', (0, 3), (-1, 3), HexColor('#fef9c3')),  # Light yellow for medium
        ('BACKGROUND', (0, 4), (-1, 4), HexColor('#dcfce7'))   # Green tint for low
    ]))
    elements.append(urgency_table)

    # 8.3 Ownership Transfer
    elements.append(Paragraph("8.3 Ownership Transfer", styles['SectionHeading']))
    elements.append(Paragraph(
        """Article ownership can be transferred to another user. This is useful when the original
        author changes roles, leaves the organization, or content responsibility shifts.""",
        styles['BodyText']
    ))

    transfer_steps = [
        "Navigate to article settings",
        "Click 'Transfer Ownership'",
        "Search for and select new owner",
        "Optionally add reason for transfer",
        "Confirm the transfer",
        "New owner receives notification",
        "Activity logged with previous/new owner details"
    ]
    for i, step in enumerate(transfer_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_9(styles):
    """Chapter 9: Analytics & Reporting"""
    elements = []

    elements.append(Paragraph("9. Analytics & Reporting", styles['ChapterHeading']))

    # 9.1 Access Logs
    elements.append(Paragraph("9.1 Access Logs", styles['SectionHeading']))
    elements.append(Paragraph(
        "Every article access is logged with detailed information for analytics and audit purposes.",
        styles['BodyText']
    ))

    log_data = [
        ['Field', 'Description'],
        ['Article ID', 'Which article was accessed'],
        ['User ID', 'Who accessed it'],
        ['Accessed At', 'Timestamp of access'],
        ['Access Type', 'VIEW, DOWNLOAD, PRINT, or SHARE'],
        ['IP Address', 'Source IP (from x-forwarded-for header)'],
        ['User Agent', 'Browser/client information'],
        ['Duration', 'Time spent viewing (seconds)'],
        ['Referrer', 'Page that led to the article'],
        ['Search Query', 'Search terms if accessed via search']
    ]

    log_table = Table(log_data, colWidths=[1.5*inch, 4.5*inch])
    log_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(log_table)

    elements.append(Paragraph(
        "<b>Note:</b> Views by the article author are not logged to avoid inflating view counts.",
        styles['NoteText']
    ))

    # 9.2 Analytics Dashboard
    elements.append(Paragraph("9.2 Analytics Dashboard", styles['SectionHeading']))
    elements.append(Paragraph(
        """The analytics dashboard provides insights into KMS usage and content performance.
        Available to Managers and Admins at /knowledge/analytics.""",
        styles['BodyText']
    ))

    elements.append(Paragraph("Dashboard Metrics:", styles['SubsectionHeading']))

    metrics_data = [
        ['Category', 'Metrics Available'],
        ['Overview', 'Total articles, Published/Draft/Archived counts, Stale articles'],
        ['Access Statistics', 'Total views, Downloads, Unique users, Unique articles viewed'],
        ['Feedback', 'Total helpful votes, Not helpful votes, Overall helpful rate %'],
        ['Trending', 'Views by date (time series chart), Period comparison'],
        ['Top Content', 'Top 10 viewed articles with helpful rates'],
        ['Search Analytics', 'Top 10 search queries with frequency'],
        ['Content Health', 'Articles needing attention, urgency breakdown'],
        ['Activity', 'Recent activity log (last 7 days)']
    ]

    metrics_table = Table(metrics_data, colWidths=[1.5*inch, 4.5*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(metrics_table)

    elements.append(Paragraph("Time Period Options:", styles['SubsectionHeading']))
    periods = ["7 Days", "30 Days (default)", "90 Days", "1 Year"]
    for period in periods:
        elements.append(Paragraph(f"• {period}", styles['BodyText']))

    # 9.3 Search Analytics
    elements.append(Paragraph("9.3 Search Analytics", styles['SectionHeading']))
    elements.append(Paragraph(
        """Search queries are tracked to understand what users are looking for. This helps identify:""",
        styles['BodyText']
    ))

    search_uses = [
        "Popular topics that need comprehensive documentation",
        "Content gaps where searches don't find results",
        "Terminology users prefer (for SEO/tagging)",
        "Emerging topics or new issues"
    ]
    for use in search_uses:
        elements.append(Paragraph(f"• {use}", styles['BodyText']))

    elements.append(PageBreak())
    return elements

def create_chapter_10(styles):
    """Chapter 10: User Flow Scenarios"""
    elements = []

    elements.append(Paragraph("10. User Flow Scenarios", styles['ChapterHeading']))

    elements.append(Paragraph(
        "This chapter details complete workflows for each user role, showing how they interact with KMS.",
        styles['BodyText']
    ))

    # 10.1 Technician Flow
    elements.append(Paragraph("10.1 Technician Flow: Creating and Publishing an Article", styles['SectionHeading']))

    tech_flow = [
        ("1. Access KMS", "Navigate to Knowledge Base from ServiceDesk navigation menu"),
        ("2. Create Article", "Click 'New Article' button to open the creation form"),
        ("3. Enter Content", "Fill in title, content (required), summary, category, tags"),
        ("4. Set Visibility", "Choose EVERYONE, BY_ROLE, BY_BRANCH, or PRIVATE"),
        ("5. Save as Draft", "Click 'Save Draft' - article saved with DRAFT status"),
        ("6. Add Attachments", "Upload supporting files (PDF, images, documents)"),
        ("7. Invite Collaborators", "Add team members as VIEWER or EDITOR (optional)"),
        ("8. Request Review", "Change status to UNDER_REVIEW when ready"),
        ("9. Address Feedback", "Respond to comments/feedback from reviewers"),
        ("10. Publish", "Change status to PUBLISHED - article goes live")
    ]

    for step, desc in tech_flow:
        elements.append(Paragraph(f"<b>{step}</b>: {desc}", styles['BodyText']))

    elements.append(Spacer(1, 15))

    # 10.2 Manager Flow
    elements.append(Paragraph("10.2 Manager Flow: Reviewing and Managing Content", styles['SectionHeading']))

    manager_flow = [
        ("1. Access Dashboard", "View KMS analytics at /knowledge/analytics"),
        ("2. Review Stale Content", "Check articles needing review, sorted by urgency"),
        ("3. Review Article", "Open stale article, verify content accuracy"),
        ("4. Mark as Reviewed", "Click 'Mark as Reviewed' to clear stale flag"),
        ("5. Check Access Logs", "View who accessed articles and when"),
        ("6. Manage Visibility", "Update visibility settings as needed"),
        ("7. Bulk Operations", "Apply permission templates to multiple articles"),
        ("8. Transfer Ownership", "Reassign articles to appropriate owners"),
        ("9. Monitor Analytics", "Track top articles, search queries, feedback trends"),
        ("10. Archive Old Content", "Archive outdated articles no longer relevant")
    ]

    for step, desc in manager_flow:
        elements.append(Paragraph(f"<b>{step}</b>: {desc}", styles['BodyText']))

    elements.append(Spacer(1, 15))

    # 10.3 End User Flow
    elements.append(Paragraph("10.3 End User Flow: Finding and Using Knowledge", styles['SectionHeading']))

    user_flow = [
        ("1. Access KMS", "Navigate to Knowledge Base from main menu"),
        ("2. Search", "Enter keywords in search bar, use filters"),
        ("3. Browse", "Filter by category, tags, or browse all articles"),
        ("4. View Article", "Click article to read full content"),
        ("5. Download Files", "Download any attached documents needed"),
        ("6. Add Comment", "Ask questions or provide additional info"),
        ("7. Give Feedback", "Click Helpful or Not Helpful to rate article"),
        ("8. Bookmark", "Save frequently used articles for quick access")
    ]

    for step, desc in user_flow:
        elements.append(Paragraph(f"<b>{step}</b>: {desc}", styles['BodyText']))

    elements.append(Spacer(1, 15))

    # 10.4 Admin Flow
    elements.append(Paragraph("10.4 Admin Flow: System Administration", styles['SectionHeading']))

    admin_flow = [
        ("1. Create Templates", "Set up permission templates for common scenarios"),
        ("2. Batch Stale Check", "Run stale content detection (cron job)"),
        ("3. View All Articles", "Access any article regardless of visibility"),
        ("4. System Analytics", "Monitor overall KMS health and usage"),
        ("5. Manage Access", "Create API keys, manage permissions"),
        ("6. Audit Activities", "Review all activity logs for compliance"),
        ("7. Content Governance", "Enforce review schedules, handle escalations"),
        ("8. Backup/Recovery", "Manage version history, restore if needed")
    ]

    for step, desc in admin_flow:
        elements.append(Paragraph(f"<b>{step}</b>: {desc}", styles['BodyText']))

    elements.append(PageBreak())

    # Summary flow diagram (text-based)
    elements.append(Paragraph("Complete Article Lifecycle", styles['SectionHeading']))

    lifecycle = """
    ┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌────────────┐
    │   CREATE    │ ──► │    DRAFT     │ ──► │  UNDER     │ ──► │  PUBLISHED │
    │   Article   │     │   (Edit)     │     │  REVIEW    │     │  (Live)    │
    └─────────────┘     └──────────────┘     └────────────┘     └────────────┘
                              │                    │                   │
                              │                    │                   │
                              ▼                    ▼                   ▼
                        ┌──────────┐         ┌──────────┐        ┌──────────┐
                        │  Add     │         │ Review   │        │ Track    │
                        │ Attachs  │         │ Feedback │        │ Access   │
                        │ Collabs  │         │ Comments │        │ Reviews  │
                        └──────────┘         └──────────┘        └──────────┘
                                                                       │
                                                                       ▼
                                                                 ┌──────────┐
                                                                 │ ARCHIVED │
                                                                 │ (End)    │
                                                                 └──────────┘
    """

    elements.append(Paragraph(lifecycle, styles['CodeText']))

    return elements

def create_appendix(styles):
    """Create appendix with API reference"""
    elements = []

    elements.append(Paragraph("Appendix A: API Reference", styles['ChapterHeading']))

    elements.append(Paragraph(
        "Complete list of KMS API endpoints for developers and integration purposes.",
        styles['BodyText']
    ))

    api_data = [
        ['Endpoint', 'Method', 'Description'],
        ['/api/knowledge', 'GET', 'List all accessible articles'],
        ['/api/knowledge', 'POST', 'Create new article'],
        ['/api/knowledge/[id]', 'GET', 'Get article details (by ID or slug)'],
        ['/api/knowledge/[id]', 'PUT', 'Update article'],
        ['/api/knowledge/[id]', 'DELETE', 'Delete article (soft delete)'],
        ['/api/knowledge/[id]/attachments', 'GET', 'List attachments'],
        ['/api/knowledge/[id]/attachments', 'POST', 'Upload attachment'],
        ['/api/knowledge/[id]/attachments/[attId]/download', 'GET', 'Download file'],
        ['/api/knowledge/[id]/versions/[verId]', 'GET', 'Get version details'],
        ['/api/knowledge/[id]/versions/[verId]', 'PATCH', 'Mark stable'],
        ['/api/knowledge/[id]/versions/[verId]/restore', 'POST', 'Restore version'],
        ['/api/knowledge/[id]/versions/compare', 'GET', 'Compare versions'],
        ['/api/knowledge/[id]/access-logs', 'GET', 'List access logs'],
        ['/api/knowledge/[id]/access-logs/stats', 'GET', 'Get access statistics'],
        ['/api/knowledge/[id]/collaborators', 'GET/POST', 'Manage collaborators'],
        ['/api/knowledge/[id]/comments', 'GET/POST', 'Manage comments'],
        ['/api/knowledge/[id]/feedback', 'POST', 'Submit feedback'],
        ['/api/knowledge/[id]/visibility', 'GET/PUT', 'Manage visibility'],
        ['/api/knowledge/[id]/ownership', 'POST', 'Transfer ownership'],
        ['/api/knowledge/[id]/review', 'GET/POST', 'Review status/mark reviewed'],
        ['/api/knowledge/stale', 'GET', 'List stale articles'],
        ['/api/knowledge/analytics', 'GET', 'Dashboard analytics'],
        ['/api/knowledge/permission-templates', 'GET/POST', 'Manage templates'],
        ['/api/knowledge/bulk/permissions', 'POST', 'Bulk apply permissions']
    ]

    api_table = Table(api_data, colWidths=[2.8*inch, 0.8*inch, 2.4*inch])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG])
    ]))
    elements.append(api_table)

    return elements

def generate_pdf():
    """Main function to generate the PDF"""
    output_path = os.path.join(os.path.dirname(__file__), "KMS_User_Guide.pdf")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=70,
        bottomMargin=60
    )

    styles = create_styles()
    elements = []

    # Build document sections
    elements.extend(create_cover_page(styles))
    elements.extend(create_toc(styles))
    elements.extend(create_chapter_1(styles))
    elements.extend(create_chapter_2(styles))
    elements.extend(create_chapter_3(styles))
    elements.extend(create_chapter_4(styles))
    elements.extend(create_chapter_5(styles))
    elements.extend(create_chapter_6(styles))
    elements.extend(create_chapter_7(styles))
    elements.extend(create_chapter_8(styles))
    elements.extend(create_chapter_9(styles))
    elements.extend(create_chapter_10(styles))
    elements.extend(create_appendix(styles))

    # Build PDF
    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)

    print(f"PDF generated successfully: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_pdf()
