/**
 * Constantes centralizadas de colores para toda la aplicación
 * Evita duplicación de mapeos de colores en múltiples archivos
 */

// Colores para badges y fondos de áreas
export const AREA_COLORS: Record<string, {
    bg: string;
    text: string;
    dot: string;
    border: string;
    light: string; // Para badges en listas
}> = {
    blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
        border: 'border-blue-500',
        light: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    green: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        dot: 'bg-green-500',
        border: 'border-green-500',
        light: 'bg-green-100 text-green-700 border-green-200'
    },
    emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        border: 'border-emerald-500',
        light: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        dot: 'bg-purple-500',
        border: 'border-purple-500',
        light: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        dot: 'bg-violet-500',
        border: 'border-violet-500',
        light: 'bg-violet-100 text-violet-700 border-violet-200'
    },
    orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        dot: 'bg-orange-500',
        border: 'border-orange-500',
        light: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    red: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-500',
        border: 'border-red-500',
        light: 'bg-red-100 text-red-700 border-red-200'
    },
    rose: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        border: 'border-rose-500',
        light: 'bg-rose-100 text-rose-700 border-rose-200'
    },
    cyan: {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        dot: 'bg-cyan-500',
        border: 'border-cyan-500',
        light: 'bg-cyan-100 text-cyan-700 border-cyan-200'
    },
    teal: {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        dot: 'bg-teal-500',
        border: 'border-teal-500',
        light: 'bg-teal-100 text-teal-700 border-teal-200'
    },
    amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        border: 'border-amber-500',
        light: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        dot: 'bg-indigo-500',
        border: 'border-indigo-500',
        light: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    pink: {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        dot: 'bg-pink-500',
        border: 'border-pink-500',
        light: 'bg-pink-100 text-pink-700 border-pink-200'
    },
};

// Color por defecto para áreas sin color definido
export const DEFAULT_AREA_COLOR = {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-400',
    light: 'bg-slate-100 text-slate-600 border-slate-200'
};

// Colores para turnos (estilo Google Calendar)
export const SHIFT_COLORS: Record<string, {
    bg: string;
    text: string;
    accent: string;
}> = {
    blue: { bg: 'bg-blue-100/80', text: 'text-blue-900', accent: 'bg-blue-500' },
    orange: { bg: 'bg-orange-100/80', text: 'text-orange-900', accent: 'bg-orange-500' },
    purple: { bg: 'bg-violet-100/80', text: 'text-violet-900', accent: 'bg-violet-500' },
    green: { bg: 'bg-emerald-100/80', text: 'text-emerald-900', accent: 'bg-emerald-500' },
    red: { bg: 'bg-rose-100/80', text: 'text-rose-900', accent: 'bg-rose-500' },
    cyan: { bg: 'bg-cyan-100/80', text: 'text-cyan-900', accent: 'bg-cyan-500' },
};

// Opciones de colores para selectores (dropdown/picker)
export const COLOR_OPTIONS = [
    { value: 'blue', label: 'Azul', bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'green', label: 'Verde', bg: 'bg-green-500', light: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'purple', label: 'Morado', bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'orange', label: 'Naranja', bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'red', label: 'Rojo', bg: 'bg-red-500', light: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'cyan', label: 'Cian', bg: 'bg-cyan-500', light: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { value: 'pink', label: 'Rosa', bg: 'bg-pink-500', light: 'bg-pink-100 text-pink-700 border-pink-200' },
    { value: 'amber', label: 'Ámbar', bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', light: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

/**
 * Helper para obtener color de área de forma segura
 */
export const getAreaColor = (colorName: string | undefined) => {
    if (!colorName) return DEFAULT_AREA_COLOR;
    return AREA_COLORS[colorName] || DEFAULT_AREA_COLOR;
};

/**
 * Helper para obtener color de turno de forma segura
 */
export const getShiftColor = (colorName: string | undefined) => {
    if (!colorName) return SHIFT_COLORS.blue;
    return SHIFT_COLORS[colorName] || SHIFT_COLORS.blue;
};

/**
 * Colores para badges en listas (StaffPage, etc.)
 */
export const BADGE_COLORS: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
};
