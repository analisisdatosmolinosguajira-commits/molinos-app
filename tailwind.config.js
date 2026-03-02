/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // 🎨 Dark Green Futuristic Design System — SENA Molinos
                brand: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669', // Primary — SENA Green
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
                accent: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6', // Teal accent (tech / futuristic)
                    600: '#0d9488',
                },
                social: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                },
                technical: {
                    100: '#d1fae5',
                    500: '#10b981',
                    600: '#059669',
                },
                status: {
                    operational: '#10b981',
                    maintenance: '#f59e0b',
                    inactive: '#ef4444',
                },
                slate: {
                    850: '#1a2e2a',
                    900: '#0f1f1b',
                    950: '#0a1612',
                }
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
                'glow': '0 0 20px rgba(5, 150, 105, 0.25)',
                'glow-accent': '0 0 20px rgba(20, 184, 166, 0.2)',
                'glass': '0 8px 32px 0 rgba(6, 78, 59, 0.08)',
                'neon': '0 0 30px rgba(16, 185, 129, 0.15), 0 0 60px rgba(5, 150, 105, 0.05)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'slide-right': 'slideRight 0.3s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideRight: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                }
            }
        },
    },
    plugins: [],
}
