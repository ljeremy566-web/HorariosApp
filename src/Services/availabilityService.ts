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
     * Guardar/actualizar horarios (upsert) - Reemplazo completo
     */
    upsertSchedule: async (schedules: DayScheduleDB[]): Promise<void> => {
        const { error } = await supabase
            .from('availability_schedule')
            .upsert(schedules, { onConflict: 'date' });

        if (error) throw error;
    },

    /**
     * Eliminar un turno específico de un día
     */
    removeShift: async (date: string, staffId: string): Promise<void> => {
        const { data } = await supabase
            .from('availability_schedule')
            .select('staff_shifts')
            .eq('date', date)
            .single();

        if (data?.staff_shifts) {
            const updated = { ...data.staff_shifts };
            delete updated[staffId];

            await supabase
                .from('availability_schedule')
                .update({ staff_shifts: updated })
                .eq('date', date);
        }
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
