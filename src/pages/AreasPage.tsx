import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../database/supabase';
import { Layers, Plus, Trash2, Loader2, Building2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Modal } from '../components/Modal';
import type { Area } from '../types';

const COLORS = [
    { val: 'blue', label: 'Azul', bg: 'bg-blue-100 text-blue-700' },
    { val: 'green', label: 'Verde', bg: 'bg-emerald-100 text-emerald-700' },
    { val: 'purple', label: 'Morado', bg: 'bg-purple-100 text-purple-700' },
    { val: 'orange', label: 'Naranja', bg: 'bg-orange-100 text-orange-700' },
    { val: 'red', label: 'Rojo', bg: 'bg-red-100 text-red-700' },
];

export default function AreasPage() {
    const location = useLocation();
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAreas(); }, []);

    // Auto-open modal when coming from quick create menu
    useEffect(() => {
        if (location.state?.openCreateForm) {
            setShowModal(true);
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const loadAreas = async () => {
        setLoading(true);
        const { data } = await supabase.from('areas').select('*').order('name');
        setAreas(data || []);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);

        const { error } = await supabase.from('areas').insert({
            name: newName.trim(),
            color: newColor
        });

        if (error) toast.error('Error al crear área');
        else {
            toast.success('Área creada');
            setShowModal(false);
            setNewName('');
            loadAreas();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta área? Los empleados asignados quedarán sin área.')) return;
        await supabase.from('areas').delete().eq('id', id);
        toast.success('Área eliminada');
        loadAreas();
    };

    return (
        <div className="max-w-5xl mx-auto">
            <Toaster position="top-right" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" /> Departamentos / Áreas
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Define las zonas de trabajo (UCI, Piso 1, Cocina...)</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all"
                >
                    <Plus size={18} /> Nueva Área
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {areas.map(area => {
                        const colorStyle = COLORS.find(c => c.val === area.color) || COLORS[0];
                        return (
                            <div
                                key={area.id}
                                className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex justify-between items-center group hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorStyle.bg}`}>
                                        <Layers size={18} />
                                    </div>
                                    <span className="font-bold text-slate-700">{area.name}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(area.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )
                    })}
                    {areas.length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <Building2 size={40} className="mx-auto mb-2 opacity-30" />
                            <p>No hay áreas definidas.</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-3 text-sm text-blue-600 hover:underline"
                            >
                                Crear primera área →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Creación */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Nueva Área"
                animationType="slide-right"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                            Nombre del Área
                        </label>
                        <input
                            required
                            autoFocus
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="Ej: Urgencias, Cocina, Piso 2..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            Color Identificativo
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {COLORS.map(c => (
                                <button
                                    type="button"
                                    key={c.val}
                                    onClick={() => setNewColor(c.val)}
                                    className={`w-9 h-9 rounded-full ${c.bg} border-2 transition-all ${newColor === c.val
                                        ? 'border-slate-500 scale-110 ring-2 ring-offset-2 ring-slate-300'
                                        : 'border-transparent hover:scale-105'
                                        }`}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-3 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
