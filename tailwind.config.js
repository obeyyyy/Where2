/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Color palette using CSS variables
      colors: {
        // Background colors
        bg: 'hsl(var(--color-bg) / <alpha-value>)',
        'bg-alt': 'hsl(var(--color-bg-alt) / <alpha-value>)',
        
        // Text colors
        text: 'hsl(var(--color-text) / <alpha-value>)',
        'text-light': 'hsl(var(--color-text-light) / <alpha-value>)',
        
        // Primary colors
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          light: 'hsl(var(--color-primary-light) / <alpha-value>)',
          dark: 'hsl(var(--color-primary-dark) / <alpha-value>)',
        },
        
        // Accent colors
        secondary: 'hsl(var(--color-secondary) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        error: 'hsl(var(--color-error) / <alpha-value>)',
        
        // UI colors
        border: 'hsl(var(--color-border) / <alpha-value>)',
      },
      
      // Border radius
      borderRadius: {
        none: '0px',
        sm: 'var(--radius-sm, 0.25rem)',
        DEFAULT: 'var(--radius-md, 0.5rem)',
        md: 'var(--radius-md, 0.5rem)',
        lg: 'var(--radius-lg, 0.75rem)',
        xl: 'var(--radius-xl, 1rem)',
        '2xl': 'var(--radius-2xl, 1.5rem)',
        full: 'var(--radius-full, 9999px)',
      },
      
      // Box shadow
      boxShadow: {
        sm: 'var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        DEFAULT: 'var(--shadow, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))',
        md: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))',
        lg: 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))',
        xl: 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },
      
      // Transition timing functions
      transitionTimingFunction: {
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      // Keyframe animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'gradient-pulse': {
          '0%, 100%': { backgroundPosition: 'left' },
          '50%': { backgroundPosition: 'right' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'pulse-once': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      
      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-once': 'pulse-once 0.6s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'gradient-pulse': 'gradient-pulse 5s ease-in-out infinite',
      },
      
      // Spacing scale
      spacing: {
        'xxs': 'var(--space-xxs, 0.25rem)',
        'xs': 'var(--space-xs, 0.5rem)',
        'sm': 'var(--space-sm, 0.75rem)',
        'md': 'var(--space-md, 1rem)',
        'lg': 'var(--space-lg, 1.5rem)',
        'xl': 'var(--space-xl, 2rem)',
        '2xl': 'var(--space-2xl, 3rem)',
        '3xl': 'var(--space-3xl, 4rem)',
      },
      
      // Typography
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(255, 140, 0, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 140, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'gradient': 'gradient-shift 3s ease infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'gradient-pulse': 'gradient-pulse 5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }, 
        'gradient-pulse': {
          '0%, 100%': { backgroundPosition: 'left' },
          '50%': { backgroundPosition: 'right' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 140, 0, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 140, 0, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(45deg, #ff8c00, #ffa500, #ff6b35, #ff8c00)',
      },
      backgroundSize: {
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
        '200%': '200%',
        '400%': '400%',
      },
    },
  },
  plugins: [],
}
