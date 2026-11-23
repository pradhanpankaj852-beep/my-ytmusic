/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:             'var(--color-bg)',
        'bg-elevated':  'var(--color-bg-elevated)',
        surface:        'var(--color-surface)',
        'surface-hover':'var(--color-surface-hover)',
        border:         'var(--color-border)',
        'border-input': 'var(--color-border-input)',
        'border-focus': 'var(--color-border-focus)',
        text:           'var(--color-text)',
        'text-secondary':'var(--color-text-secondary)',
        'text-muted':   'var(--color-text-muted)',
        accent:         'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-soft':  'var(--color-accent-soft)',
        danger:         'var(--color-danger)',
        success:        'var(--color-success)',
        warning:        'var(--color-warning)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs:   ['var(--text-xs)',   { lineHeight: 'var(--leading-tight)' }],
        sm:   ['var(--text-sm)',   { lineHeight: 'var(--leading-tight)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        md:   ['var(--text-md)',   { lineHeight: 'var(--leading-normal)' }],
        lg:   ['var(--text-lg)',   { lineHeight: 'var(--leading-tight)' }],
        xl:   ['var(--text-xl)',   { lineHeight: 'var(--leading-tight)' }],
        '2xl':['var(--text-2xl)',  { lineHeight: 'var(--leading-tight)' }],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
      spacing: {
        'header': 'var(--header-height)',
        'sidebar': 'var(--sidebar-width)',
        'mini-player': 'var(--mini-player-height)',
      },
      maxWidth: {
        content: 'var(--max-content-width)',
      },
      zIndex: {
        nav:          '100',
        'mini-player':'200',
        fullscreen:   '300',
        modal:        '400',
        toast:        '500',
      },
      transitionTimingFunction: {
        'out':    'var(--ease-out)',
        'spring': 'var(--ease-spring)',
      },
      transitionDuration: {
        fast:   'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow:   'var(--duration-slow)',
      },
    },
  },
  plugins: [],
};
