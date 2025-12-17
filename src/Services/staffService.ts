import { supabase } from '../database/supabase';
import type { Staff } from '../types';

/**
 * Servicio para operaciones CRUD de empleados (Staff)
 */
export const staffService = {
    /**
     * Obtener todos los empleados activos
     */
    getAll: async (): Promise<Staff[]> => {
        const { data, error } = await supabase
            .from('staff')
            .select('id, full_name, role, area_ids, is_active')
            .eq('is_active', true)
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Obtener todos los empleados (incluyendo inactivos)
     */
    getAllIncludingInactive: async (): Promise<Staff[]> => {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Obtener un empleado por ID
     */
    getById: async (id: string): Promise<Staff | null> => {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Crear un nuevo empleado
     */
    create: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
        const { data, error } = await supabase
            .from('staff')
            .insert([staff])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Actualizar un empleado existente
     */
    update: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
        const { data, error } = await supabase
            .from('staff')
            .update(staff)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Eliminar un empleado (soft delete - marcar como inactivo)
     */
    delete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('staff')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Eliminar permanentemente un empleado
     */
    hardDelete: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
