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
                // Semantic Colors for the Project
                brand: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7', // Primary Technical Blue
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                social: {
                    500: '#8b5cf6', // Violet/Purple for Social/Community aspects
                    600: '#7c3aed',
                    100: '#ede9fe',
                },
                technical: {
                    500: '#0ea5e9', // Blue for technical/mechanical aspects
                    600: '#0284c7',
                    100: '#e0f2fe',
                },
                // Status Indications
                status: {
                    operational: '#22c55e', // Green
                    maintenance: '#f59e0b', // Amber
                    inactive: '#ef4444',    // Red
                },
                slate: {
                    850: '#1e293b', // Custom dark slate for sophisticated backgrounds
                    900: '#0f172a',
                }
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 15px rgba(14, 165, 233, 0.3)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
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
