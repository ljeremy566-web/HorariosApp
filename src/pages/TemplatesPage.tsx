import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../database/supabase';
import { Layers, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Modal } from '../components/Modal';
import type { ShiftTemplate, TimeRange } from '../types';

// Importamos el esquema de Zod
import { shiftTemplateSchema } from '../schemas/templateSchema';

const COLORS = [
    { val: 'blue', label: 'Azul', bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700 border-blue-200' },
    { val: 'orange', label: 'Naranja', bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700 border-orange-200' },
    { val: 'purple', label: 'Morado', bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700 border-purple-200' },
    { val: 'green', label: 'Verde', bg: 'bg-green-500', light: 'bg-green-100 text-green-700 border-green-200' },
    { val: 'red', label: 'Rojo', bg: 'bg-red-500', light: 'bg-red-100 text-red-700 border-red-200' },
    { val: 'cyan', label: 'Cian', bg: 'bg-cyan-500', light: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
];

export default function TemplatesPage() {
    const location = useLocation();
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [ranges, setRanges] = useState<TimeRange[]>([
        { start: '08:00', end: '17:00' } // Horario estándar de oficina
    ]);

    // Estado para errores de validación (Zod)
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (location.state?.openCreateForm) {
            setShowModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const loadTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shift_templates')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            toast.error('Error cargando turnos');
            console.error(error);
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setNewName('');
        setNewCode('');
        setNewColor('blue');
        setRanges([{ start: '08:00', end: '17:00' }]);
        setErrors({}); // Limpiar errores al cerrar
    };

    const handleCreate = async () => {
        // 1. Preparamos el objeto a validar
        const payload = {
            name: newName.trim(),
            code: newCode.toUpperCase().trim(),
            color: newColor,
            schedule_config: ranges
        };

        // 2. Validamos con Zod (El Cerebro)
        const result = shiftTemplateSchema.safeParse(payload);

        // 3. Si falla, mostramos errores y detenemos
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};

            result.error.issues.forEach((err) => {
                // Mapeamos el error al campo correspondiente
                // Si el error es en 'schedule_config', lo mostramos general o específico
                const path = err.path[0];

                if (path === 'schedule_config' && err.path[1] !== undefined) {
                    // Error dentro de un rango específico (ej: hora fin < hora inicio)
                    const index = err.path[1];
                    const field = err.path[2]; // start o end
                    fieldErrors[`range_${String(index)}_${String(field)}`] = err.message;
                } else {
                    fieldErrors[path.toString()] = err.message;
                }
            });

            setErrors(fieldErrors);
            toast.error('Hay errores en el formulario');
            return;
        }

        // 4. Si pasa, procedemos a guardar (Datos seguros)
        setSaving(true);
        setErrors({}); // Limpiamos errores previos

        const { error } = await supabase.from('shift_templates').insert(result.data);

        if (error) {
            toast.error('Error al guardar el turno');
            console.error(error);
        } else {
            toast.success('Turno creado correctamente');
            resetForm();
            setShowModal(false);
            loadTemplates();
        }
        setSaving(false);
    };

    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (pendingDeleteId !== id) {
            setPendingDeleteId(id);
            toast(`Clic de nuevo para eliminar "${name}"`, { icon: '⚠️' });
            setTimeout(() => setPendingDeleteId(null), 3000);
            return;
        }

        const { error } = await supabase
            .from('shift_templates')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Error al eliminar');
            console.error(error);
        } else {
            toast.success('Turno eliminado');
            loadTemplates();
        }
        setPendingDeleteId(null);
    };

    const addRange = () => {
        setRanges([...ranges, { start: '13:00', end: '17:00' }]);
    };

    const updateRange = (idx: number, field: 'start' | 'end', value: string) => {
        const updated = [...ranges];
        updated[idx][field] = value;
        setRanges(updated);

        // Limpiar error específico de ese campo al editarlo
        if (errors[`range_${idx}_${field}`]) {
            const newErrors = { ...errors };
            delete newErrors[`range_${idx}_${field}`];
            setErrors(newErrors);
        }
    };

    const removeRange = (idx: number) => {
        if (ranges.length > 1) {
            setRanges(ranges.filter((_, i) => i !== idx));
        }
    };

    const getColorClass = (color: string) => {
        return COLORS.find(c => c.val === color)?.light || COLORS[0].light;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <Toaster position="top-right" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="text-indigo-600" />
                        Plantillas de Jornada
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define los horarios estándar (Turno Mañana, Tarde, Rotativo) para tus empleados.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 transition-all hover:shadow-xl"
                >
                    <Plus size={18} />
                    Nuevo Turno
                </button>
            </div>

            {/* LISTADO DE PLANTILLAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                    >
                        <div className={`h-2 ${COLORS.find(c => c.val === template.color)?.bg || 'bg-gray-400'}`} />

                        <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getColorClass(template.color)}`}>
                                        {template.code}
                                    </span>
                                    <h3 className="font-semibold text-gray-800">{template.name}</h3>
                                </div>
                                <button
                                    onClick={() => handleDelete(template.id, template.name)}
                                    className={`p-2 rounded-lg transition-all ${pendingDeleteId === template.id
                                        ? 'bg-red-500 text-white opacity-100 animate-pulse'
                                        : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                                        }`}
                                    title="Eliminar plantilla"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                {Array.isArray(template.schedule_config) && template.schedule_config.map((range, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                        <Clock size={14} className="text-gray-400" />
                                        <span className="font-mono">{range.start}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-mono">{range.end}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE CREACIÓN */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title="Configurar Nuevo Turno"
                animationType="slide-right"
            >
                <div className="space-y-5 custom-scrollbar max-h-[60vh] overflow-y-auto px-1">

                    {/* Campos Principales */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nombre del Turno *
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => {
                                    setNewName(e.target.value);
                                    if (errors.name) setErrors({ ...errors, name: '' });
                                }}
                                placeholder="Ej: Mañana Operarios"
                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                                autoFocus
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Código (Siglas) *
                            </label>
                            <input
                                type="text"
                                value={newCode}
                                onChange={(e) => {
                                    setNewCode(e.target.value.toUpperCase());
                                    if (errors.code) setErrors({ ...errors, code: '' });
                                }}
                                placeholder="TUR-1"
                                maxLength={5}
                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase font-mono ${errors.code ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                            />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>
                    </div>

                    {/* Selector de Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color Identificativo
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color.val}
                                    onClick={() => setNewColor(color.val)}
                                    className={`w-10 h-10 rounded-lg ${color.bg} transition-all ${newColor === color.val
                                        ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                                        : 'hover:scale-105'
                                        }`}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Configuración de Horarios */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jornada Laboral (Entrada - Salida)
                        </label>
                        <div className="space-y-3">
                            {ranges.map((range, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>

                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={range.start}
                                                onChange={(e) => updateRange(idx, 'start', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors[`range_${idx}_start`] ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                                            />
                                        </div>

                                        <span className="text-gray-400 font-medium text-sm">a</span>

                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={range.end}
                                                onChange={(e) => updateRange(idx, 'end', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors[`range_${idx}_end`] ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                                            />
                                        </div>

                                        {ranges.length > 1 && (
                                            <button
                                                onClick={() => removeRange(idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {/* Mensaje de error específico para el rango */}
                                    {errors[`range_${idx}_end`] && (
                                        <p className="text-red-500 text-xs pl-2">⚠️ {errors[`range_${idx}_end`]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addRange}
                            className="mt-3 text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Agregar tramo (Jornada partida)
                        </button>
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-gray-100">
                        <button
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Turno'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
