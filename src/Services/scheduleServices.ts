import { supabase } from '../database/supabase';
import type { Schedule } from '../types';

export const scheduleService = {
    getAll: async () => {
        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Schedule[];
    },

    create: async (schedule: Partial<Schedule>) => {
        const { data, error } = await supabase
            .from('schedules')
            .insert([schedule])
            .select()
            .single();
        if (error) throw error;
        return data as Schedule;
    }
};