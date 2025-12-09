import { supabase } from '../database/supabase';

export interface CalendarEvent {
    id?: string;
    title: string;
    start: Date;
    end: Date;
    resourceId: string;
    schedule_id: string;
}

export const eventService = {
    // Obtener eventos de un horario específico
    getBySchedule: async (scheduleId: string) => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('schedule_id', scheduleId);

        if (error) throw error;

        // Convertir strings de fecha a objetos Date reales para el calendario
        return data.map(event => ({
            ...event,
            start: new Date(event.start_time),
            end: new Date(event.end_time),
            resourceId: event.resource_id,
            title: event.title
        }));
    },

    create: async (event: CalendarEvent) => {
        const { data, error } = await supabase
            .from('events')
            .insert([{
                title: event.title,
                start_time: event.start,
                end_time: event.end,
                resource_id: event.resourceId,
                schedule_id: event.schedule_id
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- LA MAGIA DE LAS PLANTILLAS ---
    // Duplica todos los eventos de un horario A hacia un nuevo horario B
    cloneScheduleEvents: async (sourceScheduleId: string, targetScheduleId: string) => {
        // 1. Pedimos los eventos viejos
        const { data: oldEvents } = await supabase
            .from('events')
            .select('*')
            .eq('schedule_id', sourceScheduleId);

        if (!oldEvents || oldEvents.length === 0) return;

        // 2. Preparamos los nuevos (limpiando ID y cambiando el schedule_id)
        const newEvents = oldEvents.map(e => ({
            title: e.title,
            start_time: e.start_time, // Aquí podrías sumar días si quisieras moverlos de fecha
            end_time: e.end_time,
            resource_id: e.resource_id,
            schedule_id: targetScheduleId,
            metadata: e.metadata
        }));

        // 3. Insertamos en lote (Batch insert)
        const { error } = await supabase.from('events').insert(newEvents);
        if (error) throw error;
    }
};