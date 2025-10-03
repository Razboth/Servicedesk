import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom warm brown/cream color palette
        cream: {
          50: '#fffcf5',  // card light
          100: '#f5f1e6', // background light
          200: '#ece5d8', // muted light / foreground dark
          300: '#e2d8c3', // secondary light
          400: '#d4c8aa', // accent light
          500: '#dbd0ba', // border light
        },
        brown: {
          100: '#c5bcac', // muted foreground dark
          200: '#c0a080', // primary dark
          300: '#b3906f', // chart 2
          400: '#a67c52', // primary light
          500: '#8d6e4c', // chart 2 light
          600: '#7d6b56', // muted foreground light
          700: '#735a3a', // chart 3
          800: '#5c4d3f', // secondary foreground light
          900: '#4a3f35', // foreground light
          950: '#2d2621', // background dark
        },
        'warm-dark': {
          100: '#59493e', // accent dark
          200: '#4a4039', // secondary/border dark
          300: '#3a322c', // card/muted dark
        },
        // Sidebar colors
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Bank SulutGo brand colors
        bank: {
          primary: "hsl(var(--primary))",
          secondary: "hsl(var(--secondary))",
          accent: "hsl(var(--accent))",
          warning: "#d97706", // Orange (keep for warnings)
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif"],
        mono: ["var(--font-mono)", "ui-monospace"],
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',    // 4px
        DEFAULT: '0.5rem', // 8px
        md: '0.5rem',     // 8px
        lg: '0.75rem',    // 12px
        xl: '1rem',       // 16px
        '2xl': '1.5rem',  // 24px
        '3xl': '2rem',    // 32px
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },
      letterSpacing: {
        normal: "var(--tracking-normal)",
      },
      spacing: {
        '0': '0',
        'px': '1px',
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px (base)
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px (2x base)
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px (3x base)
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px (4x base)
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px (5x base)
        '12': '3rem',       // 48px (6x base)
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px (8x base)
        '20': '5rem',       // 80px (10x base)
        '24': '6rem',       // 96px (12x base)
        '32': '8rem',       // 128px (16x base)
        '40': '10rem',      // 160px (20x base)
        '48': '12rem',      // 192px (24x base)
        '56': '14rem',      // 224px
        '64': '16rem',      // 256px (32x base)
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config