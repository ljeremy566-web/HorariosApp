import { supabase } from '../database/supabase';
import type { Area } from '../types';

/**
 * Servicio para operaciones CRUD de áreas
 */
export const areaService = {
    /**
     * Obtener todas las áreas
     */
    getAll: async (): Promise<Area[]> => {
        const { data, error } = await supabase
            .from('areas')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Obtener un área por ID
     */
    getById: async (id: string): Promise<Area | null> => {
        const { data, error } = await supabase
            .from('areas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Crear una nueva área
     */
    create: async (area: Omit<Area, 'id'>): Promise<Area> => {
        const { data, error } = await supabase
            .from('areas')
            .insert([area])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Actualizar un área existente
     */
    update: async (id: string, area: Partial<Area>): Promise<Area> => {
        const { data, error } = await supabase
            .from('areas')
            .update(area)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Eliminar un área
     */
    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('areas')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
