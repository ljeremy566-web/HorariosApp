export interface Resource {
    id: string;
    name: string;
    type: 'DOCENTE' | 'AULA' | 'LABORATORIO' | 'EQUIPO';
    color: string;
    metadata: Record<string, any>; // JSON flexible
    is_active: boolean;
    user_id: string;
}

export interface Schedule {
    id: string;
    name: string;
    is_published: boolean;
    valid_from: string | null;
    valid_to: string | null;
    description: string;
    user_id: string;
    created_at: string;
}

export type DayStatus = 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';

export interface Holiday {
    date: string; // YYYY-MM-DD
    reason: string;
}

export interface AvailabilityConfig {
    workingDays: number[]; // 0 = Domingo, 1 = Lunes, etc.
    holidays: Holiday[];
}

export interface DayAvailability {
    date: string; // YYYY-MM-DD
    dayName: string;
    status: DayStatus;
    reason?: string;
    slots: any[]; // Placeholder for slots logic later
}

// --- Unified Types for Staff, Areas, and Templates ---

export interface TimeRange {
    start: string;
    end: string;
}

export interface Staff {
    id: string;
    full_name: string;
    role?: string;
    area_ids?: string[];
    is_active?: boolean;
}

export interface Area {
    id: string;
    name: string;
    color: string;
}

export interface ShiftTemplate {
    id: string;
    name: string;
    code: string;
    color: string;
    schedule_config: TimeRange[];
    created_at?: string;
}