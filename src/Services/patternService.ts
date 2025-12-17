import { supabase } from '../database/supabase';

/**
 * Interface para patrones guardados
 */
export interface SavedPattern {
    id: string;
    name: string;
    area: string;
    shift_data: Record<string, any>[];
    created_at?: string;
}

/**
 * Servicio para operaciones CRUD de patrones guardados
 */
export const patternService = {
    /**
     * Obtener todos los patrones guardados
     */
    getAll: async (): Promise<SavedPattern[]> => {
        const { data, error } = await supabase
            .from('saved_patterns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Crear un nuevo patrón
     */
    create: async (pattern: Omit<SavedPattern, 'id' | 'created_at'>): Promise<SavedPattern> => {
        const { data, error } = await supabase
            .from('saved_patterns')
            .insert([pattern])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Eliminar un patrón
     */
    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('saved_patterns')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
