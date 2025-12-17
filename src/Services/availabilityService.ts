import { supabase } from '../database/supabase';

/**
 * Interface para el schedule de disponibilidad diario
 */
export interface DayScheduleDB {
    date: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staff_shifts: Record<string, any>;
}

/**
 * Servicio para operaciones del schedule de disponibilidad
 */
export const availabilityService = {
    /**
     * Obtener horarios por rango de fechas
     */
    getByDateRange: async (startDate: string, endDate: string): Promise<DayScheduleDB[]> => {
        const { data, error } = await supabase
            .from('availability_schedule')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;
        return data || [];
    },

    /**
     * Guardar/actualizar horarios (upsert)
     */
    upsertSchedule: async (schedules: DayScheduleDB[]): Promise<void> => {
        const { error } = await supabase
            .from('availability_schedule')
            .upsert(schedules, { onConflict: 'date' });

        if (error) throw error;
    },

    /**
     * Obtener horario de un día específico
     */
    getByDate: async (date: string): Promise<DayScheduleDB | null> => {
        const { data, error } = await supabase
            .from('availability_schedule')
            .select('*')
            .eq('date', date)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return data;
    }
};
