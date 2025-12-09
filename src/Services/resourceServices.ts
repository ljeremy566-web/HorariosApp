import { supabase } from '../database/supabase';
import type { Resource } from '../types/index';

export const resourceService = {
    getAll: async () => {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Resource[];
    },

    create: async (resource: Omit<Resource, 'id' | 'user_id'>) => {
        const { data, error } = await supabase
            .from('resources')
            .insert([resource])
            .select()
            .single();

        if (error) throw error;
        return data as Resource;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) throw error;
    }
};