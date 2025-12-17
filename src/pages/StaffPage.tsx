import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserPlus, Trash2, Loader2, User, Briefcase, Check, Pencil } from 'lucide-react';
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

    useEffect(() => { loadData(); }, []);

    // Auto-open modal when coming from quick create menu
    useEffect(() => {
        if (location.state?.openCreateForm) {
            openCreateModal();
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

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
            // Segunda confirmación: Ejecutar borrado lógico usando servicio
            try {
                await staffService.delete(id);
                toast.success('Empleado desactivado');
                loadData();
            } catch (error) {
                toast.error('Error al eliminar');
            }
            setDeleteConfirmId(null);
        } else {
            // Primera vez: Mostrar estado de confirmación
            setDeleteConfirmId(id);
            setTimeout(() => setDeleteConfirmId(null), 3000); // Resetear a los 3s
        }
    };

    // Helper para renderizar las etiquetas de áreas en la tarjeta
    const getAreaBadges = (ids: string[]) => {
        if (!ids || ids.length === 0) return <span className="text-slate-400 text-xs italic">Sin área asignada</span>;

        return ids.map(id => {
            const area = areas.find(a => a.id === id);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
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

            {/* GRID DE TARJETAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {staff.map((person) => (
                    <div key={person.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                                    {person.full_name.substring(0, 2).toUpperCase()}
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
                        />
                    </div>

                    {/* Selector de Áreas (Chips) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Asignar Áreas de Trabajo</label>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            {areas.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-2">No hay áreas creadas. Ve a "Áreas" primero.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {areas.map(a => {
                                        const isSelected = formData.area_ids.includes(a.id);
                                        const areaColor = getAreaColor(a.color);

                                        return (
                                            <button
                                                key={a.id}
                                                onClick={() => toggleAreaSelection(a.id)}
                                                className={`
                                                    text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 font-medium
                                                    ${isSelected
                                                        ? `${areaColor.light} ring-1 ring-offset-1 ring-slate-200 shadow-sm`
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }
                                                `}
                                                type="button"
                                            >
                                                {isSelected && <Check size={12} strokeWidth={3} />}
                                                {a.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                Selecciona todas las áreas donde este empleado puede rotar.
                            </p>
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