import { supabase } from '../database/supabase';
import type { ShiftTemplate } from '../types';

/**
 * Servicio para operaciones CRUD de plantillas de turnos
 */
export const templateService = {
    /**
     * Obtener todas las plantillas de turnos
     */
    getAll: async (): Promise<ShiftTemplate[]> => {
        const { data, error } = await supabase
            .from('shift_templates')
            .select('*')
            .order('created_at');

        if (error) throw error;
        return data || [];
    },

    /**
     * Obtener una plantilla por ID
     */
    getById: async (id: string): Promise<ShiftTemplate | null> => {
        const { data, error } = await supabase
            .from('shift_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Crear una nueva plantilla
     */
    create: async (template: Omit<ShiftTemplate, 'id' | 'created_at'>): Promise<ShiftTemplate> => {
        const { data, error } = await supabase
            .from('shift_templates')
            .insert([template])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Actualizar una plantilla existente
     */
    update: async (id: string, template: Partial<ShiftTemplate>): Promise<ShiftTemplate> => {
        const { data, error } = await supabase
            .from('shift_templates')
            .update(template)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Eliminar una plantilla
     */
    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('shift_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
