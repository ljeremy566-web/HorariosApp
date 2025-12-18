import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { UserPlus, Trash2, Loader2, User, Briefcase, Check, Pencil, Search, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Modal } from '../components/Modal';
import type { Staff, Area } from '../types';
import { staffService, areaService } from '../Services';
import { getAreaColor } from '../constants/colors';

export default function StaffPage() {
    const location = useLocation();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Estado del formulario (area_ids es un array para soportar múltiples selecciones)
    const [formData, setFormData] = useState({ full_name: '', role: '', area_ids: [] as string[] });
    const [saving, setSaving] = useState(false);

    // Estado para edición - null significa modo creación
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado para confirmación visual de borrado
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Estado para búsqueda/filtrado local
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para búsqueda de áreas en el modal
    const [areaQuery, setAreaQuery] = useState('');

    // Ref para limpiar el timeout de confirmación de borrado
    const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Configuración: ¿A partir de cuántas áreas activamos el modo avanzado?
    const COMPLEX_SELECTOR_THRESHOLD = 10;
    const useSimpleSelector = areas.length <= COMPLEX_SELECTOR_THRESHOLD;

    // Áreas filtradas por búsqueda (para modo complejo)
    const filteredAreas = areas.filter(a =>
        a.name.toLowerCase().includes(areaQuery.toLowerCase())
    );

    // Helper para obtener iniciales correctamente (primera letra de cada palabra)
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .filter(Boolean)
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    // Mapa de áreas para acceso O(1) en lugar de .find()
    const areaMap = useMemo(() => {
        const map = new Map<string, Area>();
        areas.forEach(a => map.set(a.id, a));
        return map;
    }, [areas]);

    // Lista filtrada de empleados
    const filteredStaff = useMemo(() => {
        if (!searchTerm.trim()) return staff;
        const term = searchTerm.toLowerCase();
        return staff.filter(
            person =>
                person.full_name.toLowerCase().includes(term) ||
                person.role?.toLowerCase().includes(term)
        );
    }, [staff, searchTerm]);

    // Sugerencias de roles existentes (para el datalist)
    const roleSuggestions = useMemo(() => {
        const roles = new Set<string>();
        staff.forEach(s => {
            if (s.role?.trim()) roles.add(s.role.trim());
        });
        return Array.from(roles).sort();
    }, [staff]);

    useEffect(() => { loadData(); }, []);

    // Auto-open modal when coming from quick create menu
    useEffect(() => {
        if (location.state?.openCreateForm) {
            openCreateModal();
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Limpiar timeout al desmontar el componente
    useEffect(() => {
        return () => {
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
            }
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargamos Staff y Áreas en paralelo usando servicios
            const [staffData, areasData] = await Promise.all([
                staffService.getAll(),
                areaService.getAll()
            ]);

            setStaff(staffData);
            setAreas(areasData);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.full_name.trim()) return toast.error('El nombre es obligatorio');

        // Validar duplicados
        const exists = staff.some(
            s => s.full_name.toLowerCase() === formData.full_name.trim().toLowerCase()
        );
        if (exists) return toast.error('Ya existe un empleado con este nombre');

        setSaving(true);
        try {
            await staffService.create({
                full_name: formData.full_name.trim(),
                role: formData.role.trim() || undefined,
                area_ids: formData.area_ids,
                is_active: true
            });
            toast.success('Empleado añadido correctamente');
            setFormData({ full_name: '', role: '', area_ids: [] });
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar empleado');
        }
        setSaving(false);
    };

    // Función para abrir el modal en modo edición
    const handleEdit = (person: Staff) => {
        setEditingId(person.id);
        setFormData({
            full_name: person.full_name,
            role: person.role || '',
            area_ids: person.area_ids || []
        });
        setShowModal(true);
    };

    // Función para actualizar empleado existente
    const handleUpdate = async () => {
        if (!formData.full_name.trim()) return toast.error('El nombre es obligatorio');
        if (!editingId) return;

        setSaving(true);
        try {
            await staffService.update(editingId, {
                full_name: formData.full_name.trim(),
                role: formData.role.trim() || undefined,
                area_ids: formData.area_ids
            });
            toast.success('Empleado actualizado correctamente');
            closeModal();
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar empleado');
        }
        setSaving(false);
    };

    // Función para cerrar modal y limpiar estado
    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ full_name: '', role: '', area_ids: [] });
    };

    // Función para abrir modal en modo creación
    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ full_name: '', role: '', area_ids: [] });
        setShowModal(true);
    };

    // Lógica para seleccionar/deseleccionar áreas (tipo Toggle)
    const toggleAreaSelection = (areaId: string) => {
        setFormData(prev => {
            const exists = prev.area_ids.includes(areaId);
            if (exists) {
                // Si ya está, lo quitamos
                return { ...prev, area_ids: prev.area_ids.filter(id => id !== areaId) };
            } else {
                // Si no está, lo agregamos
                return { ...prev, area_ids: [...prev.area_ids, areaId] };
            }
        });
    };

    const handleDeleteClick = async (id: string) => {
        if (deleteConfirmId === id) {
            // Limpiar timeout existente
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
                deleteTimeoutRef.current = null;
            }

            // Guardar estado previo para posible rollback (Optimistic UI)
            const previousStaff = [...staff];

            // Actualizar UI inmediatamente
            setStaff(staff.filter(p => p.id !== id));
            setDeleteConfirmId(null);

            try {
                await staffService.delete(id);
                toast.success('Empleado desactivado');
                // No necesitamos loadData() si todo salió bien
            } catch (error) {
                // Revertir cambios si falló
                setStaff(previousStaff);
                toast.error('Error al eliminar');
            }
        } else {
            // Primera vez: Mostrar estado de confirmación
            setDeleteConfirmId(id);
            // Guardar referencia al timeout para poder limpiarlo
            deleteTimeoutRef.current = setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    // Helper para renderizar las etiquetas de áreas en la tarjeta (usando areaMap para O(1))
    const getAreaBadges = (ids: string[]) => {
        if (!ids || ids.length === 0) return <span className="text-slate-400 text-xs italic">Sin área asignada</span>;

        return ids.map(id => {
            const area = areaMap.get(id); // Acceso O(1) en lugar de .find()
            if (!area) return null;
            const areaColor = getAreaColor(area.color);
            return (
                <span key={id} className={`text-[10px] px-2 py-0.5 rounded border ${areaColor.light} font-medium`}>
                    {area.name}
                </span>
            );
        });
    };

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
            <Toaster position="top-right" />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-blue-600" /> Directorio de Personal
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona los empleados y asigna sus áreas de rotación.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all active:scale-95"
                >
                    <UserPlus size={18} /> Nuevo Empleado
                </button>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* GRID DE TARJETAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStaff.map((person) => (
                    <div key={person.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                                    {getInitials(person.full_name)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{person.full_name}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                                        <Briefcase size={10} /> {person.role || 'Sin cargo definido'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleEdit(person)}
                                    className="p-2 rounded-lg transition-all text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                                    title="Editar empleado"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(person.id)}
                                    className={`p-2 rounded-lg transition-all ${deleteConfirmId === person.id ? 'bg-red-500 text-white shadow-sm' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                    title={deleteConfirmId === person.id ? "Confirmar eliminar" : "Eliminar"}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* LISTA DE ÁREAS (BADGES) */}
                        <div className="mt-auto pt-3 border-t border-slate-50 flex flex-wrap gap-1.5">
                            {getAreaBadges(person.area_ids ?? [])}
                        </div>
                    </div>
                ))}

                {filteredStaff.length === 0 && staff.length > 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Search size={32} className="mb-2 opacity-20" />
                        <p>No se encontraron empleados con "{searchTerm}".</p>
                    </div>
                )}

                {staff.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <User size={32} className="mb-2 opacity-20" />
                        <p>No hay empleados registrados.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE CREACIÓN / EDICIÓN */}
            {/* MODAL DE CREACIÓN / EDICIÓN */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
                animationType="slide-right"
            >
                <div className="space-y-5 custom-scrollbar">
                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre Completo</label>
                        <input
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            placeholder="Ej: Juan Pérez"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            autoFocus
                        />
                    </div>

                    {/* Cargo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Cargo / Rol</label>
                        <input
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            placeholder="Ej: Médico General"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            list="role-suggestions"
                        />
                        <datalist id="role-suggestions">
                            {roleSuggestions.map(role => (
                                <option key={role} value={role} />
                            ))}
                        </datalist>
                    </div>

                    {/* --- SELECTOR DE ÁREAS INTELIGENTE --- */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                            Asignar Áreas de Trabajo
                        </label>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 transition-all">

                            {areas.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-2">No hay áreas creadas. Ve a "Áreas" primero.</p>
                            ) : useSimpleSelector ? (
                                /* CASO 1: POCAS ÁREAS (Modo Simple) */
                                <div className="flex flex-wrap gap-2">
                                    {areas.map(a => {
                                        const isSelected = formData.area_ids.includes(a.id);
                                        const areaColor = getAreaColor(a.color);
                                        return (
                                            <button
                                                key={a.id}
                                                onClick={() => toggleAreaSelection(a.id)}
                                                type="button"
                                                className={`
                                                    text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 font-medium
                                                    ${isSelected
                                                        ? `${areaColor.light} ring-1 ring-offset-1 ring-slate-200 shadow-sm`
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                {isSelected && <Check size={12} strokeWidth={3} />}
                                                {a.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* CASO 2: MUCHAS ÁREAS (Modo Robusto - Con Buscador y Scroll) */
                                <>
                                    {/* A. Buscador */}
                                    <div className="relative mb-3">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={`Buscar entre ${areas.length} áreas...`}
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={areaQuery}
                                            onChange={(e) => setAreaQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* B. Chips de lo que ya seleccionaste */}
                                    {formData.area_ids.length > 0 && (
                                        <div className="mb-3 pb-2 border-b border-slate-200/60">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Seleccionadas</p>
                                            <div className="flex flex-wrap gap-2">
                                                {areas.filter(a => formData.area_ids.includes(a.id)).map(a => (
                                                    <button
                                                        key={a.id}
                                                        onClick={() => toggleAreaSelection(a.id)}
                                                        type="button"
                                                        className="text-xs px-2 py-1 rounded-md border bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                        title="Clic para quitar"
                                                    >
                                                        <Check size={10} strokeWidth={3} />
                                                        {a.name}
                                                        <X size={10} className="ml-1 opacity-50" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* C. Lista Scrollable de Disponibles */}
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                                            {areaQuery ? 'Resultados' : 'Disponibles'}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {filteredAreas
                                                .filter(a => !formData.area_ids.includes(a.id))
                                                .map(a => (
                                                    <button
                                                        key={a.id}
                                                        onClick={() => toggleAreaSelection(a.id)}
                                                        type="button"
                                                        className="text-xs px-3 py-1.5 rounded-lg border bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    >
                                                        {a.name}
                                                    </button>
                                                ))}
                                            {filteredAreas.filter(a => !formData.area_ids.includes(a.id)).length === 0 && (
                                                <p className="text-xs text-slate-400 italic w-full text-center py-2">No se encontraron áreas</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Mensaje de ayuda dinámico */}
                            {areas.length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    {useSimpleSelector
                                        ? "Selecciona las áreas de rotación."
                                        : "Usa el buscador para filtrar la lista."}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={editingId ? handleUpdate : handleCreate}
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving && <Loader2 className="animate-spin w-4 h-4" />}
                            {editingId ? 'Actualizar Empleado' : 'Guardar Empleado'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}