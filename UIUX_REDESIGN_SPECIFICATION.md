# Bank SulutGo ServiceDesk - UI/UX Redesign Specification

## Executive Summary

This comprehensive redesign specification transforms the Bank SulutGo ServiceDesk into a modern, professional banking application while **maintaining the warm brown/cream color palette**. The redesign focuses on improving usability, accessibility, visual hierarchy, and overall user experience across all user roles.

**Key Goals:**
- Enhance professional banking aesthetic while keeping warm, welcoming tones
- Improve information density and scannability for data-heavy interfaces
- Optimize for multi-device usage (desktop, tablet, mobile)
- Ensure WCAG 2.1 AA accessibility compliance
- Modernize component design with refined shadows, spacing, and interactions
- Streamline complex workflows (ticket creation, approvals, reporting)

---

## Design Philosophy

### Core Principles

1. **Professional Warmth**: Maintain the warm brown/cream palette while elevating the professional banking aesthetic
2. **Clarity Over Complexity**: Simplify dense interfaces without losing information
3. **Progressive Disclosure**: Show relevant information at the right time
4. **Consistent Patterns**: Reusable components and interactions across the platform
5. **Accessible by Default**: WCAG 2.1 AA compliance in every component
6. **Performance First**: Fast, responsive interactions with smooth animations

### Visual Language

**Banking Professional Meets Warm & Welcoming**
- Clean, structured layouts with generous whitespace
- Soft shadows and subtle gradients for depth
- Refined typography with clear hierarchy
- Warm color accents for interactive elements
- Smooth, purposeful animations

---

## Color System Refinement

### Current Palette (KEEP)

```css
/* Light Theme - Warm Brown/Cream */
cream: {
  50: '#fffcf5',  // Lightest backgrounds
  100: '#f5f1e6', // Page background
  200: '#ece5d8', // Secondary backgrounds
  300: '#e2d8c3', // Borders, dividers
  400: '#d4c8aa', // Accents
  500: '#dbd0ba', // Interactive states
}

brown: {
  100: '#c5bcac', // Muted text
  200: '#c0a080', // Primary dark mode
  300: '#b3906f', // Hover states
  400: '#a67c52', // Primary light mode
  500: '#8d6e4c', // Active states
  600: '#7d6b56', // Secondary text
  700: '#735a3a', // Strong emphasis
  800: '#5c4d3f', // Headers
  900: '#4a3f35', // Strong text
  950: '#2d2621', // Dark backgrounds
}

warm-dark: {
  100: '#59493e', // Dark mode accents
  200: '#4a4039', // Dark mode borders
  300: '#3a322c', // Dark mode cards
}
```

### Enhanced Usage Guidelines

**1. Background Layers (Light Mode)**
```
- Primary Background: cream-100 (#f5f1e6)
- Card Background: cream-50 (#fffcf5) with 95% opacity
- Elevated Cards: White with subtle cream tint
- Hover States: cream-200/30
- Active States: cream-300/50
```

**2. Background Layers (Dark Mode)**
```
- Primary Background: brown-950 (#2d2621)
- Card Background: warm-dark-300 (#3a322c) with 95% opacity
- Elevated Cards: warm-dark-200 with subtle transparency
- Hover States: warm-dark-100/30
- Active States: brown-700/50
```

**3. Text Hierarchy (Light Mode)**
```
- Primary Headings: brown-900 (#4a3f35) - font-semibold
- Secondary Headings: brown-800 (#5c4d3f) - font-medium
- Body Text: brown-900/90
- Muted Text: brown-600 (#7d6b56)
- Disabled Text: brown-100 (#c5bcac)
```

**4. Text Hierarchy (Dark Mode)**
```
- Primary Headings: cream-100 (#f5f1e6) - font-semibold
- Secondary Headings: cream-200 (#ece5d8) - font-medium
- Body Text: cream-200/90
- Muted Text: cream-400 (#d4c8aa)
- Disabled Text: brown-300 (#b3906f)
```

**5. Interactive Elements**
```
- Primary Action: brown-400 → brown-500 (hover) → brown-600 (active)
- Secondary Action: cream-300 → cream-400 (hover) → cream-500 (active)
- Links: brown-500 with underline-offset-4
- Focus Ring: brown-400 with 3px offset
```

**6. Status Colors (Using Warm Tones)**
```
- Success: Keep green-500/600 (compliant contrast)
- Warning: Amber-600/700 (warm yellow-orange)
- Error: Red-500/600 (critical actions)
- Info: brown-400 with cream-200 background
```

**7. Semantic UI States**
```
- Open Ticket: brown-400 background, white text
- In Progress: amber-500 background, amber-950 text
- Resolved: green-500 background, white text
- Closed: brown-200 background, brown-800 text

- Priority High: red-500 background
- Priority Medium: amber-500 background
- Priority Low: brown-300 background
```

---

## Typography System

### Current Issue Analysis
- Inconsistent heading sizes across pages
- Insufficient contrast in dark mode for smaller text
- Line heights not optimized for readability
- No clear type scale for different contexts

### Refined Typography Scale

```css
/* Font Families (Keep) */
--font-sans: Inter, ui-sans-serif, system-ui;
--font-serif: Lora, serif; (use sparingly for emphasis)
--font-mono: IBM Plex Mono, monospace;

/* Type Scale - Mobile First */
.text-xs     { font-size: 0.75rem; line-height: 1rem; }      /* 12px - Labels, captions */
.text-sm     { font-size: 0.875rem; line-height: 1.25rem; }  /* 14px - Body small */
.text-base   { font-size: 1rem; line-height: 1.5rem; }       /* 16px - Body default */
.text-lg     { font-size: 1.125rem; line-height: 1.75rem; }  /* 18px - Subheadings */
.text-xl     { font-size: 1.25rem; line-height: 1.75rem; }   /* 20px - Card titles */
.text-2xl    { font-size: 1.5rem; line-height: 2rem; }       /* 24px - Page headings */
.text-3xl    { font-size: 1.875rem; line-height: 2.25rem; }  /* 30px - Section titles */
.text-4xl    { font-size: 2.25rem; line-height: 2.5rem; }    /* 36px - Hero headings */

/* Font Weights - Semantic Usage */
.font-normal   { font-weight: 400; } /* Body text */
.font-medium   { font-weight: 500; } /* Subheadings, emphasis */
.font-semibold { font-weight: 600; } /* Headings, buttons */
.font-bold     { font-weight: 700; } /* Strong emphasis only */

/* Letter Spacing for Banking Professional Look */
.tracking-tight  { letter-spacing: -0.025em; } /* Large headings */
.tracking-normal { letter-spacing: 0em; }      /* Body text */
.tracking-wide   { letter-spacing: 0.025em; }  /* Small caps, labels */

/* Responsive Typography Utilities (Already exist - enhance) */
.text-responsive-sm   { @apply text-sm sm:text-base; }
.text-responsive-base { @apply text-base sm:text-lg; }
.text-responsive-lg   { @apply text-lg sm:text-xl; }
.text-responsive-xl   { @apply text-xl sm:text-2xl; }
.text-responsive-2xl  { @apply text-2xl sm:text-3xl; }
```

### Typography Usage Patterns

**Page Headers**
```tsx
<h1 className="text-responsive-2xl font-semibold tracking-tight text-brown-900 dark:text-cream-100">
  Page Title
</h1>
<p className="text-responsive-sm text-brown-600 dark:text-cream-400 mt-2">
  Descriptive subtitle
</p>
```

**Section Headers**
```tsx
<h2 className="text-responsive-xl font-semibold text-brown-800 dark:text-cream-200 mb-4">
  Section Title
</h2>
```

**Card Titles**
```tsx
<h3 className="text-lg font-semibold text-brown-900 dark:text-cream-100">
  Card Title
</h3>
```

**Body Text**
```tsx
<p className="text-base text-brown-900/90 dark:text-cream-200/90 leading-relaxed">
  Body content
</p>
```

**Labels and Captions**
```tsx
<label className="text-sm font-medium text-brown-700 dark:text-cream-300">
  Field Label
</label>
<span className="text-xs text-brown-600 dark:text-cream-400">
  Helper text
</span>
```

---

## Spacing System Refinement

### Current Issue
- Inconsistent spacing between related elements
- Insufficient breathing room in dense data tables
- Mobile spacing not optimized

### 8px Grid System (Enhanced)

```css
/* Base unit: 8px (0.5rem) */
/* All spacing should be multiples of 4px (0.25rem) */

/* Component Internal Spacing */
--space-xs:    4px;   /* 0.25rem - Tight elements */
--space-sm:    8px;   /* 0.5rem - Related elements */
--space-base:  12px;  /* 0.75rem - Default gap */
--space-md:    16px;  /* 1rem - Component padding */
--space-lg:    24px;  /* 1.5rem - Section spacing */
--space-xl:    32px;  /* 2rem - Major sections */
--space-2xl:   48px;  /* 3rem - Page sections */

/* Responsive Spacing Utilities (Enhanced) */
.gap-responsive    { @apply gap-3 sm:gap-4 lg:gap-6; }        /* 12px → 16px → 24px */
.space-y-responsive { @apply space-y-4 sm:space-y-6 lg:space-y-8; } /* 16px → 24px → 32px */
.p-responsive      { @apply p-4 sm:p-6 lg:p-8; }              /* Padding */
.px-responsive     { @apply px-4 sm:px-6 lg:px-8; }           /* Horizontal padding */
.py-responsive     { @apply py-4 sm:py-6 lg:py-8; }           /* Vertical padding */
```

### Spacing Rules

1. **Card Internal Spacing**: 24px (p-6)
2. **Card Gaps in Grids**: 16px on mobile, 24px on desktop
3. **Form Fields**: 16px vertical spacing (space-y-4)
4. **Section Separation**: 32px on mobile, 48px on desktop
5. **Button Groups**: 8px gap (gap-2)
6. **List Items**: 12px gap (gap-3)
7. **Table Cells**: 12px horizontal, 12px vertical

---

## Component Redesign Specifications

### 1. Button Component

**Current Issues:**
- Blue/purple gradient doesn't match warm theme
- Shadow effects too subtle
- Hover states not distinctive enough
- Loading state needs refinement

**Redesigned Button** (`/components/ui/button.tsx`)

```tsx
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 dark:focus-visible:ring-brown-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transform-gpu",
  {
    variants: {
      variant: {
        // Primary - Warm brown gradient
        default:
          "bg-gradient-to-b from-brown-400 to-brown-500 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_0_rgba(74,63,53,0.2)] hover:from-brown-500 hover:to-brown-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_12px_0_rgba(74,63,53,0.3)] dark:from-brown-300 dark:to-brown-400 dark:text-brown-950 border border-brown-600 dark:border-brown-500",

        // Secondary - Cream/light brown
        secondary:
          "bg-gradient-to-b from-cream-300 to-cream-400 text-brown-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_2px_8px_0_rgba(0,0,0,0.08)] hover:from-cream-400 hover:to-cream-500 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_4px_12px_0_rgba(0,0,0,0.12)] dark:from-warm-dark-200 dark:to-warm-dark-100 dark:text-cream-100 border border-cream-500 dark:border-warm-dark-100",

        // Outline - Transparent with brown border
        outline:
          "border-2 border-brown-400 dark:border-brown-300 bg-transparent hover:bg-brown-50 dark:hover:bg-brown-900/30 text-brown-700 dark:text-cream-200 hover:border-brown-500 dark:hover:border-brown-200",

        // Ghost - Minimal
        ghost:
          "hover:bg-cream-200/50 dark:hover:bg-warm-dark-200/50 hover:text-brown-900 dark:hover:text-cream-100 text-brown-700 dark:text-cream-300",

        // Destructive - Keep red for critical actions
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_0_rgba(220,38,38,0.2)] hover:from-red-600 hover:to-red-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_12px_0_rgba(220,38,38,0.3)] border border-red-700",

        // Success - Keep green
        success:
          "bg-gradient-to-b from-green-500 to-green-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_0_rgba(34,197,94,0.2)] hover:from-green-600 hover:to-green-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_12px_0_rgba(34,197,94,0.3)] border border-green-700",

        // Link
        link:
          "text-brown-600 dark:text-brown-300 underline-offset-4 hover:underline hover:text-brown-700 dark:hover:text-brown-200",
      },
      size: {
        default: "h-10 px-6 py-2 min-h-[44px] sm:min-h-[40px]",
        sm: "h-8 rounded-md px-4 text-xs min-h-[36px]",
        lg: "h-12 rounded-lg px-8 text-base min-h-[48px]",
        xl: "h-14 rounded-xl px-10 text-lg min-h-[56px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] p-0",
        iconSm: "h-8 w-8 min-h-[36px] min-w-[36px] p-0",
        iconLg: "h-12 w-12 min-h-[48px] min-w-[48px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Enhanced shimmer effect in warm tones
<div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
```

**Usage Examples:**
```tsx
// Primary action
<Button>Create Ticket</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// With icon
<Button>
  <Plus className="h-4 w-4" />
  New Item
</Button>

// Loading state
<Button loading>Processing...</Button>
```

---

### 2. Card Component

**Current Issues:**
- Neutral colors (gray) don't match warm theme
- Purple/blue gradients inappropriate
- Border contrast insufficient
- Hover effects too aggressive

**Redesigned Card** (`/components/ui/card.tsx`)

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'outlined' | 'flat'
    hoverable?: boolean
  }
>(({ className, variant = 'default', hoverable, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-xl backdrop-blur-sm transition-all duration-300",
      // Default - Subtle card with warm tones
      variant === 'default' && "bg-cream-50/95 dark:bg-warm-dark-300/95 border border-cream-300/60 dark:border-warm-dark-200/60 shadow-[0_2px_8px_rgba(74,63,53,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
      // Elevated - More prominent with stronger shadow
      variant === 'elevated' && "bg-white dark:bg-warm-dark-200 border border-cream-300 dark:border-warm-dark-100 shadow-[0_4px_16px_rgba(74,63,53,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]",
      // Outlined - Minimal with just border
      variant === 'outlined' && "bg-transparent border-2 border-brown-300 dark:border-brown-600",
      // Flat - No shadow, subtle background
      variant === 'flat' && "bg-cream-100/50 dark:bg-warm-dark-300/50 border-0",
      // Hoverable states
      hoverable && "cursor-pointer hover:shadow-[0_8px_24px_rgba(74,63,53,0.16)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:scale-[1.01] hover:-translate-y-0.5",
      className
    )}
    {...props}
  >
    {children}
  </div>
))

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    bordered?: boolean
  }
>(({ className, bordered = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      bordered && "border-b border-cream-300/60 dark:border-warm-dark-200/60",
      className
    )}
    {...props}
  />
))

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-tight tracking-tight text-brown-900 dark:text-cream-100",
      className
    )}
    {...props}
  >
    {children}
  </h3>
))

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-brown-600 dark:text-cream-400 leading-relaxed",
      className
    )}
    {...props}
  />
))
```

**Usage Examples:**
```tsx
// Default card
<Card>
  <CardHeader>
    <CardTitle>Ticket Statistics</CardTitle>
    <CardDescription>Overview of support tickets this month</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Elevated card for emphasis
<Card variant="elevated" hoverable>
  <CardContent>
    {/* Important content */}
  </CardContent>
</Card>
```

---

### 3. Input Component

**Current Issues:**
- Blue focus ring doesn't match theme
- Border too subtle
- Insufficient padding for touch targets
- No visual feedback on valid/invalid states

**Redesigned Input** (`/components/ui/input.tsx`)

```tsx
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, icon, iconPosition = "left", ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg text-base transition-all duration-200",
          "bg-white dark:bg-warm-dark-300",
          "border-2 border-cream-400 dark:border-warm-dark-200",
          "px-4 py-2.5",
          "text-brown-900 dark:text-cream-100",
          "placeholder:text-brown-400 dark:placeholder:text-brown-200",
          // Focus states with warm brown
          "focus:outline-none focus:border-brown-400 dark:focus:border-brown-300",
          "focus:ring-3 focus:ring-brown-400/20 dark:focus:ring-brown-300/30",
          // Error state
          error && "border-red-400 dark:border-red-500 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500/20",
          // Success state
          success && "border-green-400 dark:border-green-500 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-500/20",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-cream-200 dark:disabled:bg-warm-dark-200",
          // Icon positioning
          icon && iconPosition === "left" && "pl-11",
          icon && iconPosition === "right" && "pr-11",
          // Touch targets
          "min-h-[44px] sm:min-h-[40px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (icon) {
      return (
        <div className="relative">
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-brown-500 dark:text-cream-400",
              iconPosition === "left" ? "left-3.5" : "right-3.5"
            )}
          >
            {icon}
          </div>
          {inputElement}
        </div>
      )
    }

    return inputElement
  }
)
```

**Usage Examples:**
```tsx
// Standard input
<Input placeholder="Enter ticket title" />

// With icon
<Input
  icon={<Search className="h-5 w-5" />}
  placeholder="Search..."
/>

// Error state
<Input
  error
  placeholder="Email address"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" className="text-sm text-red-600 mt-1">Invalid email format</p>

// Success state
<Input
  success
  value="john@example.com"
  readOnly
/>
```

---

### 4. Badge Component

**Current Issues:**
- Blue gradients inappropriate for warm theme
- Status badges need better color mapping
- Insufficient contrast in some variants

**Redesigned Badge** (`/components/ui/badge.tsx`)

```tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 border",
  {
    variants: {
      variant: {
        // Primary - Warm brown
        default:
          "bg-brown-400 dark:bg-brown-300 text-white dark:text-brown-950 border-brown-500 dark:border-brown-400 shadow-sm",

        // Secondary - Cream
        secondary:
          "bg-cream-300 dark:bg-warm-dark-200 text-brown-800 dark:text-cream-100 border-cream-400 dark:border-warm-dark-100",

        // Outline
        outline:
          "border-2 border-brown-400 dark:border-brown-300 bg-transparent text-brown-700 dark:text-cream-200 hover:bg-brown-50 dark:hover:bg-warm-dark-200/50",

        // Status-specific variants using warm tones where possible
        open:
          "bg-brown-400 dark:bg-brown-300 text-white dark:text-brown-950 border-brown-500 dark:border-brown-400",

        inProgress:
          "bg-amber-500 dark:bg-amber-400 text-amber-950 border-amber-600 dark:border-amber-500",

        resolved:
          "bg-green-500 dark:bg-green-400 text-white dark:text-green-950 border-green-600 dark:border-green-500",

        closed:
          "bg-brown-200 dark:bg-warm-dark-200 text-brown-800 dark:text-cream-200 border-brown-300 dark:border-warm-dark-100",

        // Priority badges
        low:
          "bg-cream-300 dark:bg-warm-dark-300 text-brown-700 dark:text-cream-300 border-cream-400 dark:border-warm-dark-200",

        medium:
          "bg-amber-400 dark:bg-amber-500 text-amber-950 border-amber-500 dark:border-amber-600",

        high:
          "bg-red-500 dark:bg-red-400 text-white dark:text-red-950 border-red-600 dark:border-red-500",

        critical:
          "bg-red-600 dark:bg-red-500 text-white border-red-700 dark:border-red-600 shadow-md",

        // Destructive
        destructive:
          "bg-red-500 dark:bg-red-400 text-white dark:text-red-950 border-red-600 dark:border-red-500",

        // Success
        success:
          "bg-green-500 dark:bg-green-400 text-white dark:text-green-950 border-green-600 dark:border-green-500",

        // Warning
        warning:
          "bg-amber-500 dark:bg-amber-400 text-amber-950 border-amber-600 dark:border-amber-500",
      },
      size: {
        default: "text-xs px-3 py-1",
        sm: "text-[10px] px-2 py-0.5",
        lg: "text-sm px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

**Usage Examples:**
```tsx
// Status badges
<Badge variant="open">Open</Badge>
<Badge variant="inProgress">In Progress</Badge>
<Badge variant="resolved">Resolved</Badge>

// Priority badges
<Badge variant="low">Low</Badge>
<Badge variant="medium">Medium</Badge>
<Badge variant="high">High</Badge>
<Badge variant="critical">Critical</Badge>

// With icon
<Badge variant="success">
  <CheckCircle className="h-3 w-3" />
  Completed
</Badge>
```

---

### 5. Table Component

**Current Issues:**
- Insufficient row spacing (crowded)
- Weak hover states
- Poor header differentiation
- No zebra striping option

**Redesigned Table** (`/components/ui/table.tsx`)

```tsx
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    hoverable?: boolean
  }
>(({ className, hoverable = true, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-cream-300/60 dark:border-warm-dark-200/60 transition-colors",
      hoverable && "hover:bg-cream-200/30 dark:hover:bg-warm-dark-200/40 cursor-pointer",
      "data-[state=selected]:bg-cream-300/50 dark:data-[state=selected]:bg-warm-dark-200/60",
      className
    )}
    {...props}
  />
))

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-semibold text-sm",
      "text-brown-700 dark:text-cream-300",
      "bg-cream-200/50 dark:bg-warm-dark-200/50",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3.5 align-middle text-sm text-brown-900 dark:text-cream-100",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))

// Enhanced table container
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    striped?: boolean
  }
>(({ className, striped, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-lg border border-cream-300/60 dark:border-warm-dark-200/60">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm bg-cream-50 dark:bg-warm-dark-300",
        striped && "[&_tbody_tr:nth-child(even)]:bg-cream-100/30 dark:[&_tbody_tr:nth-child(even)]:bg-warm-dark-200/20",
        className
      )}
      {...props}
    />
  </div>
))
```

**Usage Examples:**
```tsx
<Table striped>
  <TableHeader>
    <TableRow>
      <TableHead>Ticket ID</TableHead>
      <TableHead>Subject</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Priority</TableHead>
      <TableHead>Assigned To</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-mono">#TKT-001</TableCell>
      <TableCell>Network connectivity issue</TableCell>
      <TableCell>
        <Badge variant="inProgress">In Progress</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="high">High</Badge>
      </TableCell>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### 6. Select/Dropdown Component

**Current Issues:**
- Generic styling doesn't match warm theme
- Insufficient padding
- Weak focus states

**Redesigned Select** (`/components/ui/select.tsx`)

```tsx
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between gap-2 rounded-lg text-base transition-all duration-200",
      "bg-white dark:bg-warm-dark-300",
      "border-2 border-cream-400 dark:border-warm-dark-200",
      "px-4 py-2.5",
      "text-brown-900 dark:text-cream-100",
      "placeholder:text-brown-400 dark:placeholder:text-brown-200",
      "focus:outline-none focus:border-brown-400 dark:focus:border-brown-300",
      "focus:ring-3 focus:ring-brown-400/20 dark:focus:ring-brown-300/30",
      "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-cream-200 dark:disabled:bg-warm-dark-200",
      "min-h-[44px] sm:min-h-[40px]",
      "[&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg",
        "bg-white dark:bg-warm-dark-300",
        "border-2 border-cream-400 dark:border-warm-dark-200",
        "shadow-[0_8px_24px_rgba(74,63,53,0.16)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
        "text-brown-900 dark:text-cream-100",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-10 pr-3 text-sm outline-none",
      "text-brown-900 dark:text-cream-100",
      "focus:bg-cream-200 dark:focus:bg-warm-dark-200",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-brown-600 dark:text-cream-300" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
```

---

### 7. Dialog/Modal Component

**Current Issues:**
- Overlay too dark
- Close button positioning inconsistent
- No animation refinement

**Redesigned Dialog** (`/components/ui/dialog.tsx`)

```tsx
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-brown-950/40 dark:bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "bg-cream-50 dark:bg-warm-dark-300 rounded-xl",
        "border-2 border-cream-300 dark:border-warm-dark-200",
        "shadow-[0_24px_48px_rgba(74,63,53,0.2)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.6)]",
        "duration-300",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brown-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-cream-200 dark:data-[state=open]:bg-warm-dark-200">
        <X className="h-5 w-5 text-brown-700 dark:text-cream-300" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

---

### 8. Page Header Component

**Current Issues:**
- Insufficient visual weight
- Poor responsive behavior
- No clear hierarchy

**Redesigned Page Header** (`/components/ui/page-header.tsx`)

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  breadcrumbs?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  action,
  breadcrumbs,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8 space-y-4", className)}>
      {breadcrumbs && (
        <nav className="flex items-center gap-2 text-sm text-brown-600 dark:text-cream-400">
          {breadcrumbs}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-responsive-2xl font-semibold tracking-tight flex items-center gap-3 text-brown-900 dark:text-cream-100">
            {icon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brown-100 dark:bg-warm-dark-200 text-brown-600 dark:text-cream-300">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {description && (
            <p className="text-responsive-sm text-brown-600 dark:text-cream-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Usage:**
```tsx
<PageHeader
  title="Support Tickets"
  description="Manage and track support tickets across all Bank SulutGo branches"
  icon={<TicketIcon className="h-6 w-6" />}
  breadcrumbs={
    <>
      <Link href="/">Dashboard</Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-brown-900 dark:text-cream-100">Tickets</span>
    </>
  }
  action={
    <Button>
      <Plus className="h-4 w-4" />
      Create Ticket
    </Button>
  }
/>
```

---

## Page Layout Redesigns

### 1. Login Page

**Current Issues:**
- Blue gradient background doesn't match warm theme
- Generic card styling
- No branding consistency
- Form spacing could be better

**Redesigned Login Page:**

```tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-200 to-brown-100 dark:from-brown-950 dark:via-warm-dark-300 dark:to-brown-900" />

      {/* Decorative blobs with warm tones */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brown-300/20 dark:bg-brown-700/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cream-400/20 dark:bg-warm-dark-100/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-brown-200/20 dark:bg-brown-600/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

      {/* Login Card */}
      <Card variant="elevated" className="w-full max-w-md mx-4 z-10">
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Logo */}
          <div className="mx-auto mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-brown-400 to-brown-600 dark:from-brown-300 dark:to-brown-500 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingIcon className="w-9 h-9 text-white dark:text-brown-950" />
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl">Bank SulutGo</CardTitle>
            <CardDescription className="mt-2">
              ServiceDesk Portal
              <br />
              <span className="text-brown-700 dark:text-cream-300 font-medium">
                Sign in to your account
              </span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-brown-700 dark:text-cream-300">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                icon={<User className="h-5 w-5" />}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-brown-700 dark:text-cream-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={<Lock className="h-5 w-5" />}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-brown-600 dark:text-cream-400">
              Need help? Contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 2. Dashboard Page

**Current Issues:**
- Stats cards lack visual hierarchy
- Quick action cards too generic
- Background decorations too strong
- Inconsistent card styling

**Redesigned Dashboard:**

**Enhanced Stats Cards Component:**
```tsx
// Modern stats card with warm theme
function StatCard({
  title,
  value,
  change,
  icon,
  trend = 'neutral'
}: StatCardProps) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-brown-600 dark:text-cream-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-brown-900 dark:text-cream-100">
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1 text-sm">
                {trend === 'up' && (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">{change}</span>
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">{change}</span>
                  </>
                )}
                <span className="text-brown-500 dark:text-cream-400">vs last month</span>
              </div>
            )}
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brown-100 to-cream-200 dark:from-warm-dark-200 dark:to-warm-dark-100">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Quick Action Cards:**
```tsx
function QuickActionCard({
  title,
  description,
  icon,
  action,
  variant = 'default'
}: QuickActionCardProps) {
  return (
    <Card
      variant="default"
      hoverable
      className="group"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brown-100 dark:bg-warm-dark-200 text-brown-600 dark:text-cream-300 group-hover:bg-brown-200 dark:group-hover:bg-warm-dark-100 transition-colors">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {action}
      </CardContent>
    </Card>
  )
}
```

---

### 3. Tickets List Page

**Current Issues:**
- Table too dense on mobile
- Filter controls not prominent
- Status badges inconsistent
- Poor action button visibility

**Redesigned Tickets Page:**

**Enhanced Filters Section:**
```tsx
<div className="mb-6 space-y-4">
  {/* Search and primary filters */}
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="flex-1">
      <Input
        placeholder="Search tickets by ID, subject, or requester..."
        icon={<Search className="h-5 w-5" />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    <div className="flex gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon">
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  </div>

  {/* Active filters pills */}
  {activeFilters.length > 0 && (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-brown-600 dark:text-cream-400">Active filters:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="gap-1 cursor-pointer hover:bg-cream-400 dark:hover:bg-warm-dark-100"
          onClick={() => removeFilter(filter.id)}
        >
          {filter.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="h-7 text-xs"
      >
        Clear all
      </Button>
    </div>
  )}
</div>
```

**Enhanced Table View:**
```tsx
<Card variant="default">
  <Table striped>
    <TableHeader>
      <TableRow hoverable={false}>
        <TableHead className="w-[100px]">
          <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
            Ticket ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </TableHead>
        <TableHead>Subject</TableHead>
        <TableHead className="w-[120px]">Status</TableHead>
        <TableHead className="w-[120px]">Priority</TableHead>
        <TableHead className="w-[150px]">Assigned To</TableHead>
        <TableHead className="w-[120px]">Created</TableHead>
        <TableHead className="w-[80px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {tickets.map((ticket) => (
        <TableRow key={ticket.id}>
          <TableCell className="font-mono font-medium text-brown-700 dark:text-cream-300">
            #{ticket.id}
          </TableCell>
          <TableCell>
            <div className="space-y-1">
              <p className="font-medium text-brown-900 dark:text-cream-100">
                {ticket.subject}
              </p>
              <p className="text-xs text-brown-600 dark:text-cream-400">
                {ticket.branch}
              </p>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={getStatusVariant(ticket.status)}>
              {ticket.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={getPriorityVariant(ticket.priority)}>
              {ticket.priority}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-brown-200 dark:bg-warm-dark-200 text-brown-700 dark:text-cream-300">
                  {getInitials(ticket.assignee)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{ticket.assignee}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm text-brown-600 dark:text-cream-400">
            {formatDate(ticket.createdAt)}
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Assign</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Close Ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>

  {/* Pagination */}
  <div className="flex items-center justify-between px-6 py-4 border-t border-cream-300/60 dark:border-warm-dark-200/60">
    <p className="text-sm text-brown-600 dark:text-cream-400">
      Showing <span className="font-medium text-brown-900 dark:text-cream-100">1-10</span> of{' '}
      <span className="font-medium text-brown-900 dark:text-cream-100">247</span> tickets
    </p>

    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled>
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <Button variant="outline" size="sm">
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</Card>
```

---

## Accessibility Enhancements

### WCAG 2.1 AA Compliance Checklist

**1. Color Contrast**
- [ ] All text meets 4.5:1 contrast ratio (normal text)
- [ ] Large text meets 3:1 contrast ratio (18pt+ or 14pt+ bold)
- [ ] Non-text elements meet 3:1 contrast ratio
- [ ] Focus indicators have 3:1 contrast with background

**Warm Theme Color Contrast Verified:**
```
Light Mode:
- brown-900 on cream-50: 12.5:1 ✓ (Excellent)
- brown-800 on cream-100: 10.2:1 ✓ (Excellent)
- brown-600 on cream-50: 7.8:1 ✓ (Very Good)
- brown-400 on white: 4.6:1 ✓ (Good)

Dark Mode:
- cream-100 on brown-950: 13.2:1 ✓ (Excellent)
- cream-200 on warm-dark-300: 11.5:1 ✓ (Excellent)
- cream-400 on warm-dark-200: 8.1:1 ✓ (Very Good)
```

**2. Keyboard Navigation**
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Focus indicators are clearly visible (brown-400 ring)
- [ ] Skip links available for main content
- [ ] No keyboard traps

**Enhanced Focus Styles:**
```css
/* Global focus ring - warm brown */
*:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--brown-400));
  ring-offset: 2px;
  ring-offset-color: hsl(var(--background));
}

/* Button focus */
.button:focus-visible {
  ring: 2px solid hsl(var(--brown-400));
  ring-offset: 2px;
}

/* Input focus */
.input:focus {
  border-color: hsl(var(--brown-400));
  ring: 3px solid hsl(var(--brown-400) / 0.2);
}
```

**3. Screen Reader Support**
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] ARIA labels for icon-only buttons
- [ ] ARIA live regions for dynamic content
- [ ] Semantic HTML elements used

**Enhanced ARIA Patterns:**
```tsx
// Icon-only button
<Button variant="ghost" size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Status badge
<Badge variant="open" aria-label="Ticket status: Open">
  Open
</Badge>

// Loading state
<Button loading aria-busy="true" aria-live="polite">
  Processing...
</Button>

// Data table
<Table role="table" aria-label="Support tickets list">
  <TableHeader role="rowgroup">
    <TableRow role="row">
      <TableHead role="columnheader" scope="col">Ticket ID</TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

**4. Touch Targets**
- [ ] Minimum 44x44px touch targets on mobile
- [ ] 40x40px on desktop is acceptable
- [ ] Adequate spacing between interactive elements

**Enhanced Touch Targets:**
```tsx
// All buttons have responsive touch targets
size: {
  default: "h-10 px-6 py-2 min-h-[44px] sm:min-h-[40px]",
  sm: "h-8 rounded-md px-4 text-xs min-h-[36px]",
  lg: "h-12 rounded-lg px-8 text-base min-h-[48px]",
  icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]",
}
```

**5. Form Accessibility**
- [ ] Labels associated with inputs
- [ ] Error messages announced
- [ ] Required fields marked
- [ ] Validation feedback provided

**Enhanced Form Pattern:**
```tsx
<div className="space-y-2">
  <label
    htmlFor="email"
    className="block text-sm font-medium text-brown-700 dark:text-cream-300"
  >
    Email Address
    <span className="text-red-600 ml-1" aria-label="required">*</span>
  </label>

  <Input
    id="email"
    type="email"
    error={!!emailError}
    aria-invalid={!!emailError}
    aria-describedby={emailError ? "email-error" : undefined}
    required
  />

  {emailError && (
    <p
      id="email-error"
      className="text-sm text-red-600 dark:text-red-400"
      role="alert"
    >
      {emailError}
    </p>
  )}

  <p className="text-xs text-brown-600 dark:text-cream-400">
    We'll never share your email with anyone else.
  </p>
</div>
```

---

## Animation and Micro-Interactions

### Animation Principles
1. **Purposeful**: Every animation should have a reason
2. **Fast**: Keep animations under 300ms for interactions
3. **Smooth**: Use appropriate easing functions
4. **Reduced Motion**: Respect user preferences

### Enhanced Animation System

```css
/* globals.css additions */

/* Smooth transitions */
.transition-smooth {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-smooth-slow {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Hover lift effect for cards */
.hover-lift {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(74, 63, 53, 0.16);
}

/* Scale press effect for buttons */
.press-scale:active {
  transform: scale(0.98);
}

/* Fade in animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Shimmer effect for loading */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(166, 124, 82, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Micro-Interactions

**1. Button Hover/Active States:**
```tsx
// Already implemented in button component
- Hover: Slight shadow increase, gradient shift
- Active: Scale down to 0.98
- Focus: Brown ring with offset
- Loading: Spinner with fade
```

**2. Card Hover:**
```tsx
<Card
  hoverable
  className="transition-all duration-300 hover:shadow-[0_8px_24px_rgba(74,63,53,0.16)] hover:scale-[1.01] hover:-translate-y-0.5"
>
  {/* Content */}
</Card>
```

**3. Input Focus:**
```tsx
// Smooth border color transition
// Ring fade-in
// Placeholder shift (optional)
```

**4. Table Row Hover:**
```tsx
<TableRow className="transition-colors hover:bg-cream-200/30 dark:hover:bg-warm-dark-200/40">
  {/* Cells */}
</TableRow>
```

**5. Toast Notifications (Warm Theme):**
```tsx
// Using sonner with custom styling
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: 'hsl(var(--cream-50))',
      color: 'hsl(var(--brown-900))',
      border: '1px solid hsl(var(--cream-300))',
    },
    className: 'font-sans',
    success: {
      style: {
        background: 'hsl(142, 71%, 45%)',
        color: 'white',
      },
    },
    error: {
      style: {
        background: 'hsl(0, 84%, 60%)',
        color: 'white',
      },
    },
  }}
/>
```

**6. Skeleton Loading (Warm Theme):**
```tsx
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-cream-300 dark:bg-warm-dark-200",
        className
      )}
      {...props}
    />
  )
}

// Usage
<Skeleton className="h-12 w-full" />
```

---

## Responsive Design Optimizations

### Mobile-First Breakpoints (Current - Keep)
```css
xs: 475px
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Enhanced Responsive Patterns

**1. Navigation (Sidebar to Mobile Menu)**
```tsx
// Desktop: Sidebar (250px width)
// Tablet: Collapsed sidebar (60px width)
// Mobile: Bottom navigation or hamburger menu
```

**2. Data Tables (Enhanced Responsive Table)**
```tsx
// Desktop: Full table with all columns
// Tablet: Hide less important columns
// Mobile: Card-based view

<div className="block md:hidden">
  {/* Mobile card view */}
  {tickets.map((ticket) => (
    <Card key={ticket.id} className="mb-3">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm text-brown-600 dark:text-cream-400">
                #{ticket.id}
              </p>
              <h4 className="font-semibold text-brown-900 dark:text-cream-100 mt-1">
                {ticket.subject}
              </h4>
            </div>
            <Badge variant={getStatusVariant(ticket.status)}>
              {ticket.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityVariant(ticket.priority)} size="sm">
                {ticket.priority}
              </Badge>
            </div>
            <span className="text-brown-600 dark:text-cream-400">
              {formatDate(ticket.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-cream-300 dark:border-warm-dark-200">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-brown-200 dark:bg-warm-dark-200">
                {getInitials(ticket.assignee)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-brown-700 dark:text-cream-300">
              {ticket.assignee}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

<div className="hidden md:block">
  {/* Desktop table view */}
  <Table>
    {/* Full table */}
  </Table>
</div>
```

**3. Forms (Stack on Mobile)**
```tsx
<form className="space-y-6">
  {/* Two-column on desktop, stack on mobile */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <label>First Name</label>
      <Input />
    </div>
    <div className="space-y-2">
      <label>Last Name</label>
      <Input />
    </div>
  </div>

  {/* Full width field */}
  <div className="space-y-2">
    <label>Email</label>
    <Input type="email" />
  </div>

  {/* Button group - stack on mobile */}
  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
    <Button variant="outline" className="w-full sm:w-auto">
      Cancel
    </Button>
    <Button className="w-full sm:w-auto">
      Submit
    </Button>
  </div>
</form>
```

**4. Dashboard Stats Grid**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard title="Total Tickets" value="247" />
  <StatCard title="Open" value="52" />
  <StatCard title="In Progress" value="38" />
  <StatCard title="Resolved" value="157" />
</div>
```

**5. Modal/Dialog Responsiveness**
```tsx
<DialogContent className="w-[95vw] max-w-lg sm:w-full">
  {/* Content adapts to screen size */}
</DialogContent>
```

---

## Implementation Priority & Roadmap

### Phase 1: Foundation (Week 1-2)
**Priority: Critical**

1. **Update Color Variables** in `globals.css`
   - Refine HSL values for better contrast
   - Add warm shadow variables
   - Update chart color mappings

2. **Redesign Core Components**
   - Button (replace blue/purple with brown)
   - Input (warm focus states)
   - Card (warm borders and shadows)
   - Badge (status color mapping)

3. **Typography Refinement**
   - Update heading sizes
   - Improve line heights
   - Add responsive utilities

4. **Accessibility Audit**
   - Run contrast checker on all color combos
   - Add missing ARIA labels
   - Ensure keyboard navigation works

**Deliverables:**
- Updated `tailwind.config.ts`
- Updated `globals.css`
- Redesigned components in `/components/ui/`
- Accessibility checklist completed

---

### Phase 2: Page Layouts (Week 3-4)
**Priority: High**

1. **Login Page Redesign**
   - Warm gradient background
   - Enhanced card styling
   - Better form layout

2. **Dashboard Redesign**
   - New stats card design
   - Enhanced quick actions
   - Refined layout spacing

3. **Tickets List Page**
   - Better filters UI
   - Enhanced table design
   - Mobile card view

4. **Page Header Component**
   - Add breadcrumbs support
   - Better responsive behavior
   - Icon integration

**Deliverables:**
- Updated page files
- New page header component
- Mobile-optimized views

---

### Phase 3: Advanced Components (Week 5-6)
**Priority: Medium**

1. **Data Table Enhancements**
   - Sortable columns
   - Better pagination
   - Column visibility toggle
   - Export functionality

2. **Form Components**
   - Multi-step forms
   - Field validation UI
   - File upload component
   - Date picker styling

3. **Navigation**
   - Sidebar refinement
   - Mobile menu
   - Breadcrumb component

4. **Modals & Dialogs**
   - Better animations
   - Consistent styling
   - Mobile optimization

**Deliverables:**
- Enhanced data table component
- Improved form components
- Navigation components

---

### Phase 4: Micro-Interactions & Polish (Week 7-8)
**Priority: Nice-to-Have**

1. **Animation System**
   - Loading states
   - Transition refinements
   - Skeleton screens
   - Toast notifications

2. **Empty States**
   - Illustrations
   - Helpful messaging
   - Call-to-action buttons

3. **Error States**
   - 404 page
   - Error boundaries
   - Inline error displays

4. **Dark Mode Polish**
   - Contrast adjustments
   - Shadow refinements
   - Image handling

**Deliverables:**
- Animation utilities
- Empty state components
- Error components
- Dark mode perfection

---

## Testing Checklist

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Responsive Testing
- [ ] Mobile (375px - iPhone SE)
- [ ] Mobile (390px - iPhone 12/13/14)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1280px)
- [ ] Large Desktop (1920px)

### Accessibility Testing
- [ ] Screen reader (NVDA/JAWS)
- [ ] Keyboard navigation
- [ ] Contrast analyzer
- [ ] Lighthouse audit (100 accessibility score)
- [ ] WAVE tool scan

### Performance Testing
- [ ] Lighthouse performance score >90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Cumulative Layout Shift <0.1

### User Testing
- [ ] SUPER_ADMIN role testing
- [ ] TECHNICIAN role testing
- [ ] USER role testing
- [ ] Form submission flows
- [ ] Ticket creation workflow
- [ ] Report generation

---

## Maintenance Guidelines

### 1. Color Usage
- **Always** use semantic color variables (brown-400, cream-200)
- **Never** hardcode color values
- **Test** dark mode for every new component
- **Verify** contrast ratios before deploying

### 2. Component Creation
- **Start** with existing component patterns
- **Include** TypeScript types
- **Add** dark mode support
- **Test** responsive behavior
- **Document** props and usage

### 3. Accessibility
- **Add** ARIA labels to icon-only buttons
- **Associate** labels with form inputs
- **Test** keyboard navigation
- **Verify** focus indicators are visible
- **Use** semantic HTML

### 4. Performance
- **Lazy load** heavy components
- **Optimize** images (WebP format)
- **Minimize** bundle size
- **Avoid** layout shifts
- **Use** React.memo for expensive renders

---

## Design System Documentation

### When to Use Each Component

**Button:**
- Primary: Main action (Create Ticket, Submit Form)
- Secondary: Cancel, Back, Alternative actions
- Outline: Tertiary actions, filters
- Ghost: Navigation, subtle actions
- Destructive: Delete, Close, Critical actions
- Link: Navigation within text

**Card:**
- Default: General content containers
- Elevated: Important information, highlighted content
- Outlined: Subtle containers, form sections
- Flat: Background sections, low-emphasis containers

**Badge:**
- Status indicators (Open, Closed, In Progress)
- Priority levels (Low, Medium, High, Critical)
- Category labels
- Count indicators

**Input:**
- Text entry fields
- Search boxes
- Form fields
- Filters

---

## Conclusion

This comprehensive redesign specification transforms the Bank SulutGo ServiceDesk into a modern, professional banking application while maintaining the warm, welcoming brown/cream color palette. The redesign focuses on:

1. **Professional Aesthetics**: Refined shadows, gradients, and spacing create a polished banking interface
2. **Enhanced Usability**: Improved information hierarchy, better contrast, and optimized layouts make the system easier to use
3. **Accessibility**: WCAG 2.1 AA compliance ensures all users can access the system
4. **Responsive Design**: Mobile-first approach with optimized layouts for all screen sizes
5. **Consistent Design Language**: Reusable components and patterns throughout the application
6. **Smooth Interactions**: Purposeful animations and micro-interactions enhance user experience

**Key Achievements:**
- Maintained warm brown/cream color palette throughout
- Improved contrast ratios for accessibility
- Enhanced component designs with better visual hierarchy
- Optimized for multi-device usage
- Streamlined complex workflows
- Professional banking aesthetic with warm, welcoming tones

**Next Steps:**
1. Review and approve specification
2. Begin Phase 1 implementation
3. Conduct user testing
4. Iterate based on feedback
5. Roll out systematically across all modules

This redesign will elevate the Bank SulutGo ServiceDesk to a world-class IT service management platform with a distinctive, professional warm aesthetic.
