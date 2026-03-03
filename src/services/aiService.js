/**
 * AI Assistant Service
 * Handles communication with the ai-extract Edge Function
 */
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract`;

/**
 * Convert a File object to base64 string
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data:...;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Compress an image file if it's too large (>2MB)
 */
async function compressImage(file, maxWidth = 1600) {
    if (file.size < 2 * 1024 * 1024) return file; // Skip if < 2MB

    return new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.8);
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Extract form data using AI
 * @param {string} modalType - Type of modal (e.g., 'mill', 'activity', 'diagnosis')
 * @param {File[]} files - Array of files (images, PDFs, etc.)
 * @param {string} instruction - Text instruction from the user
 * @returns {Promise<{fields: object, confidence: object, warnings: string[], suggestions: string[]}>}
 */
export async function extractFormData(modalType, files = [], instruction = '') {
    try {
        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');

        // Process files
        const processedFiles = [];
        for (const file of files) {
            let processedFile = file;

            // Compress images
            if (file.type.startsWith('image/')) {
                processedFile = await compressImage(file);
            }

            const base64 = await fileToBase64(processedFile);
            processedFiles.push({
                base64,
                mimeType: processedFile.type,
                name: file.name
            });
        }

        // Call Edge Function
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                modalType,
                instruction,
                files: processedFiles
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMsg = errorData.error || `Error del servidor: ${response.status}`;
            // Make rate limit errors user-friendly
            if (errorMsg.includes('Límite de uso') || errorMsg.includes('quota') || errorMsg.includes('429')) {
                errorMsg = 'La IA está temporalmente ocupada. Espera 1 minuto e intenta de nuevo. Si persiste, verifica tu API key en aistudio.google.com';
            }
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        console.error('AI Service error:', error);
        throw error;
    }
}

/**
 * Supported modal types
 */
export const AI_SUPPORTED_MODALS = [
    'mill',
    // Future: 'activity', 'diagnosis', 'concertation', 'pump', 'community', 'failure_report'
];

/**
 * Check if a modal type supports AI extraction
 */
export function isAiSupported(modalType) {
    return AI_SUPPORTED_MODALS.includes(modalType);
}
