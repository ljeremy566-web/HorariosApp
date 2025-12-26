
// --- TYPES ---
// Estructura de un turno asignado: guarda el template Y el área en que se creó
export interface ShiftAssignment {
    templateId: string;
    areaId: string | null; // null = asignado en modo "Todos"
}

export interface DaySchedule {
    date: string;
    dayName: string;
    dayNumber: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staffShifts: Record<string, string | ShiftAssignment>; // Soporta ambos formatos para compatibilidad
}

// Helper para obtener datos del turno de forma segura (soporta formato antiguo y nuevo)
export const getShiftData = (shift: string | ShiftAssignment): ShiftAssignment => {
    if (typeof shift === 'string') {
        // Formato antiguo: solo templateId (migración de datos existentes)
        return { templateId: shift, areaId: null };
    }
    return shift;
};
