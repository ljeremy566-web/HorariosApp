import { useState, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import {
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    Lock, Unlock, Save, Loader2, Calendar, GripVertical, Clock, User,
    Wand2, X, Shuffle, AlignJustify, Repeat, Check, CalendarDays, Sparkles
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import type { Staff, ShiftTemplate } from '../../types';

interface DaySchedule {
    date: string;
    dayName: string;
    dayNumber: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staffShifts: Record<string, string>; // { staffId: templateId }
}

const COLORS: Record<string, { light: string; full: string }> = {
    blue: { light: 'bg-blue-100 text-blue-700 border-blue-200', full: 'bg-blue-500' },
    orange: { light: 'bg-orange-100 text-orange-700 border-orange-200', full: 'bg-orange-500' },
    purple: { light: 'bg-purple-100 text-purple-700 border-purple-200', full: 'bg-purple-500' },
    green: { light: 'bg-green-100 text-green-700 border-green-200', full: 'bg-green-500' },
    red: { light: 'bg-red-100 text-red-700 border-red-200', full: 'bg-red-500' },
    cyan: { light: 'bg-cyan-100 text-cyan-700 border-cyan-200', full: 'bg-cyan-500' },
};

// --- DRAGGABLE STAFF ITEM ---
function DraggableStaff({ staff }: { staff: Staff }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `staff-${staff.id}`,
        data: { staff }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200 
                cursor-grab active:cursor-grabbing select-none transition-all
                hover:shadow-md hover:border-indigo-300
                ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}
            `}
        >
            <GripVertical size={14} className="text-gray-300" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {staff.full_name.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{staff.full_name}</span>
        </div>
    );
}

// --- DROPPABLE DAY CELL ---
function DroppableDay({
    day,
    dayIdx,
    staffList,
    templates,
    onToggleStatus,
    onCycleShift,
    onRemoveShift
}: {
    day: DaySchedule;
    dayIdx: number;
    staffList: Staff[];
    templates: ShiftTemplate[];
    onToggleStatus: (idx: number) => void;
    onCycleShift: (dayIdx: number, staffId: string) => void;
    onRemoveShift: (dayIdx: number, staffId: string) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${day.date}`,
        data: { dayIdx, day }
    });

    const assignedStaff = Object.entries(day.staffShifts).map(([staffId, templateId]) => {
        const staff = staffList.find(s => s.id === staffId);
        const template = templates.find(t => t.id === templateId);
        return { staffId, staff, template };
    }).filter(a => a.staff);

    return (
        <div
            ref={setNodeRef}
            className={`
                relative rounded-xl border-2 transition-all min-h-[180px] flex flex-col overflow-hidden
                ${day.status === 'OPEN'
                    ? isOver
                        ? 'bg-indigo-50 border-indigo-400 shadow-lg scale-[1.02]'
                        : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'
                    : 'bg-gray-100 border-gray-200 opacity-60'
                }
            `}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/50">
                <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                        {day.dayName}
                    </span>
                    <span className="text-xl font-bold text-gray-800">{day.dayNumber}</span>
                </div>
                <button
                    onClick={() => onToggleStatus(dayIdx)}
                    className={`p-2 rounded-full transition-colors ${day.status === 'OPEN'
                        ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-100'
                        : 'text-red-500 bg-red-100'
                        }`}
                >
                    {day.status === 'OPEN' ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {day.status === 'OPEN' ? (
                    assignedStaff.length > 0 ? (
                        assignedStaff.map(({ staffId, staff, template }) => (
                            <div
                                key={staffId}
                                onClick={() => onCycleShift(dayIdx, staffId)}
                                onContextMenu={(e) => { e.preventDefault(); onRemoveShift(dayIdx, staffId); }}
                                className={`
                                    p-2 rounded-lg border cursor-pointer select-none transition-all hover:shadow-sm
                                    ${template ? COLORS[template.color]?.light || COLORS.blue.light : 'bg-gray-100 border-gray-300'}
                                `}
                                title="Click: Cambiar turno | Clic derecho: Quitar"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-[9px] font-bold">
                                            {staff?.full_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-bold truncate">{staff?.full_name.split(' ')[0]}</span>
                                    </div>
                                    {template && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/60 rounded">
                                            {template.code}
                                        </span>
                                    )}
                                </div>
                                {template && Array.isArray(template.schedule_config) && (
                                    <div className="mt-1 pt-1 border-t border-black/10 text-[9px] space-y-0.5 opacity-80">
                                        {template.schedule_config.map((r, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <Clock size={8} />
                                                <span>{r.start} - {r.end}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 py-4">
                            <User size={20} className="mb-1" />
                            <span className="text-xs">Arrastra personal aquí</span>
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-red-300 py-4">
                        <Lock size={20} className="mb-1" />
                        <span className="text-xs font-medium">Cerrado</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- GENERATOR MODAL (Google Material You Style) ---
function GeneratorModal({
    isOpen,
    onClose,
    onGenerate,
    templates,
    COLORS
}: {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (mode: 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK', selectedIds: string[]) => void;
    templates: ShiftTemplate[];
    COLORS: Record<string, { light: string; full: string }>;
}) {
    const [mode, setMode] = useState<'UNIFORM' | 'PATTERN' | 'RANDOM_PICK'>('RANDOM_PICK');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    if (!isOpen) return null;

    const toggleTemplate = (id: string) => {
        if (mode === 'UNIFORM') {
            setSelectedIds([id]);
        } else {
            setSelectedIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#001d35]/20 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative bg-white w-full max-w-lg rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out border border-white/50">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-normal text-[#001d35] flex items-center gap-2">
                        <Sparkles className="text-indigo-500 fill-indigo-100" size={20} />
                        Generar <span className="font-semibold">Horarios</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 pb-2">
                    <div className="flex p-1 bg-[#f0f4f8] rounded-full">
                        {[
                            { id: 'RANDOM_PICK', label: 'Aleatorio', icon: Shuffle },
                            { id: 'UNIFORM', label: 'Fijo', icon: AlignJustify },
                            { id: 'PATTERN', label: 'Rotativo', icon: Repeat },
                        ].map((tab) => {
                            const isActive = mode === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setMode(tab.id as 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK'); setSelectedIds([]); }}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-200
                                        ${isActive
                                            ? 'bg-white text-[#001d35] shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }
                                    `}
                                >
                                    <Icon size={16} className={isActive ? 'text-indigo-600' : ''} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* Description */}
                    <div className="mb-6 px-4 py-3 bg-[#eaf1fb] text-[#001d35] rounded-xl text-sm border border-[#d3e3fd] flex gap-3">
                        <div className="mt-0.5 shrink-0 text-blue-600"><CalendarDays size={18} /></div>
                        <p>
                            {mode === 'RANDOM_PICK' && "Rellena los huecos vacíos eligiendo al azar entre los turnos que selecciones abajo."}
                            {mode === 'UNIFORM' && "Aplica un único turno a todos los espacios vacíos del calendario visible."}
                            {mode === 'PATTERN' && "Asigna turnos en secuencia rotativa (A → B → C) para distribuir la carga equitativamente."}
                        </p>
                    </div>

                    {/* Template Selector */}
                    {mode !== 'PATTERN' ? (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                                {mode === 'UNIFORM' ? 'Selecciona 1 turno' : 'Selecciona los turnos a usar'}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {templates.map(t => {
                                    const isSelected = selectedIds.includes(t.id);

                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => toggleTemplate(t.id)}
                                            className={`
                                                relative p-3 rounded-2xl border transition-all duration-200 text-left group
                                                ${isSelected
                                                    ? 'bg-[#d3e3fd] border-[#7cacf8] shadow-sm'
                                                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm font-bold ${isSelected ? 'text-[#001d35]' : 'text-slate-700'}`}>
                                                    {t.code}
                                                </span>
                                                {isSelected && (
                                                    <div className="bg-[#001d35] text-white rounded-full p-0.5 animate-in zoom-in duration-200">
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[11px] truncate block mt-1 ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                                                {t.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                <Repeat size={32} className="opacity-50" />
                            </div>
                            <p className="text-sm">El patrón usará todos los turnos disponibles en orden.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onGenerate(mode, selectedIds)}
                        disabled={mode !== 'PATTERN' && selectedIds.length === 0}
                        className="bg-[#001d35] text-[#d3e3fd] hover:text-white hover:shadow-lg hover:-translate-y-0.5 px-6 py-2.5 rounded-full font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                    >
                        <Wand2 size={16} />
                        Generar ahora
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
export default function ScheduleManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [includeSundays, setIncludeSundays] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);

    const [activeStaff, setActiveStaff] = useState<Staff | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        })
    );

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (!loading) applySundayRule(); }, [includeSundays]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [staffRes, tmplRes] = await Promise.all([
                supabase.from('staff').select('id, full_name').eq('is_active', true),
                supabase.from('shift_templates').select('*')
            ]);
            setStaffList(staffRes.data || []);
            setTemplates(tmplRes.data || []);

            const today = new Date();
            const start = today.toISOString().split('T')[0];
            const endObj = new Date(today);
            endObj.setDate(today.getDate() + 15);

            const { data: schedule } = await supabase
                .from('availability_schedule')
                .select('*')
                .gte('date', start)
                .lte('date', endObj.toISOString().split('T')[0]);

            generateGrid(schedule || []);
        } catch (e) {
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const generateGrid = (dbData: any[]) => {
        const today = new Date();
        const newDays: DaySchedule[] = [];
        const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        for (let i = 0; i < 15; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayIdx = d.getDay();
            const saved = dbData?.find(s => s.date === dateStr);

            newDays.push({
                date: dateStr,
                dayName: weekDays[dayIdx].toUpperCase(),
                dayNumber: d.getDate().toString().padStart(2, '0'),
                status: saved ? saved.status : (dayIdx === 0 ? 'DISABLED_BY_RULE' : 'OPEN'),
                staffShifts: saved?.staff_shifts || {}
            });
        }
        setDays(newDays);
    };

    const applySundayRule = () => {
        setDays(prev => prev.map(d => {
            if (d.dayName === 'DOMINGO') {
                return {
                    ...d,
                    status: includeSundays ? (d.status === 'DISABLED_BY_RULE' ? 'OPEN' : d.status) : 'DISABLED_BY_RULE'
                };
            }
            return d;
        }));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.staff) {
            setActiveStaff(data.staff);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveStaff(null);

        const { active, over } = event;
        if (!over) return;

        const dayData = over.data.current;
        const staffData = active.data.current;

        if (!dayData || !staffData?.staff) return;

        const { dayIdx, day } = dayData;
        const { staff } = staffData;

        if (day.status !== 'OPEN') {
            toast.error('Este día está cerrado');
            return;
        }

        if (templates.length === 0) {
            toast.error('Primero crea plantillas de turno');
            return;
        }

        // Assign first template as default
        const newDays = [...days];
        newDays[dayIdx].staffShifts[staff.id] = templates[0].id;
        setDays(newDays);
        toast.success(`${staff.full_name} asignado`);
    };

    const cycleShift = (dayIdx: number, staffId: string) => {
        const newDays = [...days];
        if (newDays[dayIdx].status !== 'OPEN') return;
        if (templates.length === 0) return;

        const currentTmplId = newDays[dayIdx].staffShifts[staffId];
        const currentIndex = templates.findIndex(t => t.id === currentTmplId);

        if (currentIndex < templates.length - 1) {
            newDays[dayIdx].staffShifts[staffId] = templates[currentIndex + 1].id;
        } else {
            // Cycle back to first
            newDays[dayIdx].staffShifts[staffId] = templates[0].id;
        }

        setDays(newDays);
    };

    const removeShift = (dayIdx: number, staffId: string) => {
        const newDays = [...days];
        delete newDays[dayIdx].staffShifts[staffId];
        setDays(newDays);
        toast.success('Asignación eliminada');
    };

    const toggleDayStatus = (idx: number) => {
        const newDays = [...days];
        newDays[idx].status = newDays[idx].status === 'OPEN' ? 'CLOSED' : 'OPEN';
        if (newDays[idx].status === 'CLOSED') {
            newDays[idx].staffShifts = {};
        }
        setDays(newDays);
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = days.map(d => ({
            date: d.date,
            status: d.status,
            staff_shifts: d.staffShifts
        }));

        const { error } = await supabase
            .from('availability_schedule')
            .upsert(payload, { onConflict: 'date' });

        if (error) {
            toast.error('Error al guardar');
        } else {
            toast.success('Horario guardado correctamente');
        }
        setSaving(false);
    };

    // --- SCHEDULE GENERATION LOGIC ---
    const handleGenerateSchedule = (
        mode: 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK',
        selectedIds: string[]
    ) => {
        const newDays = days.map((day, dayIndex) => {
            if (day.status !== 'OPEN') return day;
            const newShifts = { ...day.staffShifts };

            staffList.forEach((staff, staffIndex) => {
                // Solo rellenar huecos vacíos
                if (newShifts[staff.id]) return;

                let templateId = '';

                if (mode === 'UNIFORM') {
                    templateId = selectedIds[0];
                } else if (mode === 'RANDOM_PICK') {
                    templateId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
                } else if (mode === 'PATTERN') {
                    const idx = (dayIndex + staffIndex) % templates.length;
                    templateId = templates[idx].id;
                }

                if (templateId) newShifts[staff.id] = templateId;
            });
            return { ...day, staffShifts: newShifts };
        });

        setDays(newDays);
        setShowGenerator(false);
        toast.success('¡Horario generado mágicamente! ✨');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col">
                <Toaster position="top-right" />

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="text-indigo-600" />
                            Planificador de 15 Días
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Arrastra personal a los días. Clic para cambiar turno. Clic derecho para quitar.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* GENERAR BUTTON */}
                        <button
                            onClick={() => setShowGenerator(true)}
                            className="group flex items-center gap-2 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dffc] hover:shadow-md px-4 py-2 rounded-xl font-medium transition-all"
                            title="Generación Automática"
                        >
                            <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />
                            <span className="hidden sm:inline">Generar</span>
                        </button>
                        <button
                            onClick={() => setIncludeSundays(!includeSundays)}
                            className={`px-4 py-2 rounded-lg font-medium border transition-all text-sm ${includeSundays
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-gray-300 text-gray-500'
                                }`}
                        >
                            {includeSundays ? '✓ Domingos' : '✗ Domingos'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-md disabled:opacity-50 transition-all"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Guardar Todo
                        </button>
                    </div>
                </div>

                {/* LEGEND */}
                {templates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {templates.map(t => (
                            <div
                                key={t.id}
                                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${COLORS[t.color]?.light || COLORS.blue.light}`}
                            >
                                <span className="font-bold">{t.code}</span>
                                <span className="opacity-70">-</span>
                                <span>{t.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* MAIN LAYOUT */}
                <div className="flex-1 flex gap-4 min-h-0">
                    {/* LEFT PANEL - STAFF */}
                    <div className="w-64 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <User size={12} /> Personal Disponible
                        </h3>
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                            {staffList.map(staff => (
                                <DraggableStaff key={staff.id} staff={staff} />
                            ))}
                            {staffList.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">
                                    No hay personal activo
                                </p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL - CALENDAR GRID */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                            {days.map((day, idx) => (
                                <DroppableDay
                                    key={day.date}
                                    day={day}
                                    dayIdx={idx}
                                    staffList={staffList}
                                    templates={templates}
                                    onToggleStatus={toggleDayStatus}
                                    onCycleShift={cycleShift}
                                    onRemoveShift={removeShift}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* DRAG OVERLAY */}
                <DragOverlay>
                    {activeStaff && (
                        <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border-2 border-indigo-400 shadow-xl cursor-grabbing">
                            <GripVertical size={14} className="text-indigo-400" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {activeStaff.full_name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{activeStaff.full_name}</span>
                        </div>
                    )}
                </DragOverlay>

                {/* GENERATOR MODAL */}
                <GeneratorModal
                    isOpen={showGenerator}
                    onClose={() => setShowGenerator(false)}
                    onGenerate={handleGenerateSchedule}
                    templates={templates}
                    COLORS={COLORS}
                />
            </div>
        </DndContext>
    );
}