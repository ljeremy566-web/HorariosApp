import { useState, useEffect } from 'react';
import { supabase } from '../database/supabase';
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
    Lock, Unlock, Save, Loader2, GripVertical, Clock,
    User, Copy, Trash2, ChevronLeft, ChevronRight, Users,
    BookmarkPlus, DownloadCloud, X, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Staff, Area, ShiftTemplate } from '../types';

// Colores para áreas (mapeo de nombre a clases Tailwind)
const AREA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

interface DaySchedule {
    date: string;
    dayName: string;
    dayNumber: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staffShifts: Record<string, string>; // { staffId: templateId }
}

// Colores visuales para los turnos
const COLORS: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-[#c2e7ff]', text: 'text-[#001d35]', border: 'border-l-4 border-[#004a77]' },
    orange: { bg: 'bg-[#ffdbcd]', text: 'text-[#5a1e00]', border: 'border-l-4 border-[#8c2d00]' },
    purple: { bg: 'bg-[#e5deff]', text: 'text-[#1d0063]', border: 'border-l-4 border-[#4700d8]' },
    green: { bg: 'bg-[#c4eed0]', text: 'text-[#003912]', border: 'border-l-4 border-[#006e22]' },
    red: { bg: 'bg-[#ffcdd2]', text: 'text-[#410002]', border: 'border-l-4 border-[#a50e0e]' },
    cyan: { bg: 'bg-[#b8f6ff]', text: 'text-[#00363d]', border: 'border-l-4 border-[#006874]' },
};

// --- MODAL DE CONFIRMACIÓN REUTILIZABLE ---
function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'default'
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
                    <p className="text-sm text-slate-600">{message}</p>
                </div>
                <div className="flex border-t border-slate-100">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 text-sm font-bold transition-colors border-l border-slate-100 ${variant === 'danger'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-blue-600 hover:bg-blue-50'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE DRAGGABLE (EMPLEADO LATERAL) ---
function DraggableStaff({ staff, areas }: { staff: Staff; areas: Area[] }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `staff-${staff.id}`,
        data: { staff }
    });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    // Obtener el primer área del empleado para mostrar su color
    const staffArea = staff.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
    const areaColor = staffArea ? (AREA_COLORS[staffArea.color] || AREA_COLORS.blue) : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                flex items-center gap-3 p-2.5 mx-2 my-1 bg-white rounded-lg border border-slate-200 
                cursor-grab active:cursor-grabbing select-none transition-all group hover:shadow-md hover:border-blue-400
                ${isDragging ? 'opacity-50 ring-2 ring-blue-400 z-50' : ''}
            `}
        >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${areaColor
                ? `${areaColor.bg} ${areaColor.text} ${areaColor.border}`
                : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {staff.full_name.substring(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-700 font-medium truncate">{staff.full_name}</div>
                {staffArea && (
                    <div className={`text-[10px] truncate ${areaColor?.text || 'text-slate-400'}`}>
                        {staffArea.name}
                    </div>
                )}
            </div>
            <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500" />
        </div>
    );
}

// --- COMPONENTE DROPPABLE (COLUMNA DE DÍA) ---
function DroppableColumn({
    day,
    dayIdx,
    staffList,
    templates,
    viewMode,
    onCycleShift,
    onRemoveShift,
    onDayAction
}: {
    day: DaySchedule;
    dayIdx: number;
    staffList: Staff[];
    templates: ShiftTemplate[];
    viewMode: 'edit' | 'preview';
    onCycleShift: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
    onDayAction: (action: 'copy_prev' | 'clear' | 'toggle', idx: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${day.date}`,
        data: { dayIdx, day }
    });

    // Filtramos solo los turnos de los empleados visibles (según el área seleccionada)
    const visibleAssignments = Object.entries(day.staffShifts).map(([staffId, templateId]) => {
        const staff = staffList.find(s => s.id === staffId);
        const template = templates.find(t => t.id === templateId);
        return { staffId, staff, template };
    }).filter(a => a.staff); // Si staff es undefined (no está en el filtro de área), no se muestra

    const isToday = isSameDay(new Date(day.date + 'T00:00:00'), new Date());

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[200px] flex-1 flex flex-col border-r border-slate-200 h-full transition-colors relative
                ${day.status !== 'OPEN' ? 'bg-[url("https://www.transparenttextures.com/patterns/diagonal-striped-brick.png")] bg-slate-50' : (isOver ? 'bg-blue-50/50' : 'bg-white')}
            `}
        >
            {/* Cabecera Sticky */}
            <div className={`
                sticky top-0 z-10 border-b border-slate-200 p-3 text-center transition-colors
                ${isToday ? 'bg-blue-50' : 'bg-white'}
                ${day.status !== 'OPEN' ? 'opacity-70 bg-slate-100' : ''}
            `}>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {day.dayName.substring(0, 3)}
                </div>
                <div className={`
                    text-2xl font-normal inline-flex items-center justify-center w-10 h-10 rounded-full mb-1
                    ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}
                `}>
                    {day.dayNumber}
                </div>

                {/* Botones de acción rápida por día */}
                {viewMode === 'edit' && (
                    <div className="flex justify-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onDayAction('toggle', dayIdx)} className="p-1 hover:bg-slate-100 rounded text-slate-400" title={day.status === 'OPEN' ? "Cerrar día" : "Abrir día"}>
                            {day.status === 'OPEN' ? <Unlock size={12} /> : <Lock size={12} />}
                        </button>
                        {dayIdx > 0 && day.status === 'OPEN' && (
                            <button onClick={() => onDayAction('copy_prev', dayIdx)} title="Copiar del día anterior" className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                <Copy size={12} />
                            </button>
                        )}
                        <button onClick={() => onDayAction('clear', dayIdx)} title="Limpiar todo" className="p-1 hover:bg-slate-100 rounded text-slate-400">
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Contenido de Turnos */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar relative">
                {day.status === 'OPEN' ? (
                    visibleAssignments.length > 0 ? (
                        visibleAssignments.map(({ staffId, staff, template }) => {
                            const theme = template ? (COLORS[template.color] || COLORS.blue) : COLORS.blue;
                            return (
                                <div
                                    key={staffId}
                                    onClick={() => viewMode === 'edit' && onCycleShift(dayIdx, staffId)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (viewMode === 'edit') onRemoveShift(dayIdx, staffId);
                                    }}
                                    className={`
                                        p-2.5 rounded text-sm cursor-pointer shadow-sm transition-all hover:shadow-md hover:scale-[1.02]
                                        ${theme.bg} ${theme.text} ${theme.border} group/card relative
                                    `}
                                >
                                    <div className="font-semibold flex justify-between items-center">
                                        <span className="truncate">{staff?.full_name.split(' ')[0]}</span>
                                        {template && <span className="text-[10px] opacity-70 font-black uppercase tracking-tight">{template.code}</span>}
                                    </div>
                                    {template?.schedule_config && (
                                        <div className="text-[10px] mt-1 opacity-90 flex flex-col gap-0.5">
                                            {template.schedule_config.map((r, i) => (
                                                <span key={i} className="flex items-center gap-1">
                                                    <Clock size={8} /> {r.start}-{r.end}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Hint para borrar */}
                                    {viewMode === 'edit' && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity scale-75">
                                            <X size={8} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        viewMode === 'edit' && (
                            <div className="h-24 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-lg m-2">
                                <span className="text-xs font-medium">Vacío</span>
                            </div>
                        )
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400/50">
                        <Lock size={24} className="mb-2" />
                        <span className="text-xs font-medium uppercase tracking-widest">Cerrado</span>
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {visibleAssignments.length} Asignados
                </span>
            </div>
        </div>
    );
}

// --- PÁGINA PRINCIPAL ---
export default function SchedulerPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    // Estados de Control y Datos
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL'); // Filtro por ID de Área
    const [showPatternModal, setShowPatternModal] = useState(false);
    const [sundaysBlocked, setSundaysBlocked] = useState(true); // Control de domingos

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);

    const [activeStaff, setActiveStaff] = useState<Staff | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Estado para modal de confirmación
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'default' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // --- FILTRADO INTELIGENTE (MULTI-ÁREA) ---
    // Si 'ALL', mostramos todos. Si no, verificamos si el areaId está en el array area_ids del empleado
    const filteredStaff = selectedAreaId === 'ALL'
        ? staffList
        : staffList.filter(s => s.area_ids && s.area_ids.includes(selectedAreaId));

    useEffect(() => { loadData(); }, [currentDate]);

    // Toggle para bloquear/desbloquear domingos
    const toggleSundays = () => {
        const newState = !sundaysBlocked;
        setSundaysBlocked(newState);

        // Actualizar días existentes
        const newDays = days.map(d => {
            const date = new Date(d.date + 'T12:00:00');
            if (date.getDay() === 0) {
                return { ...d, status: newState ? 'DISABLED_BY_RULE' as const : 'OPEN' as const };
            }
            return d;
        });
        setDays(newDays);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [staffRes, areasRes, tmplRes] = await Promise.all([
                supabase.from('staff').select('id, full_name, role, area_ids').eq('is_active', true).order('full_name'),
                supabase.from('areas').select('*').order('name'),
                supabase.from('shift_templates').select('*').order('created_at')
            ]);

            setStaffList(staffRes.data || []);
            setAreas(areasRes.data || []);
            setTemplates(tmplRes.data || []);

            const startStr = format(currentDate, 'yyyy-MM-dd');
            const endObj = addDays(currentDate, 13); // Vista de 14 días

            const { data: schedule } = await supabase
                .from('availability_schedule')
                .select('*')
                .gte('date', startStr)
                .lte('date', format(endObj, 'yyyy-MM-dd'));

            generateGrid(schedule || [], currentDate);
        } catch (e) {
            console.error(e);
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const generateGrid = (dbData: any[], startDate: Date) => {
        const newDays: DaySchedule[] = [];
        for (let i = 0; i < 14; i++) {
            const d = addDays(startDate, i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const saved = dbData?.find((s: any) => s.date === dateStr);
            const dayName = format(d, 'EEEE', { locale: es });

            const isSunday = d.getDay() === 0;

            // Determinar status
            let status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE' = 'OPEN';

            if (isSunday) {
                // Domingos: bloqueados o abiertos según toggle
                status = sundaysBlocked ? 'DISABLED_BY_RULE' : 'OPEN';
            } else if (saved?.status === 'CLOSED') {
                // Otros días: solo CLOSED se respeta de la BD (DISABLED_BY_RULE es solo domingos)
                status = 'CLOSED';
            }

            newDays.push({
                date: dateStr,
                dayName,
                dayNumber: format(d, 'dd'),
                status,
                staffShifts: saved?.staff_shifts || {}
            });
        }
        setDays(newDays);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const daysToMove = 14;
        const newDate = direction === 'next' ? addDays(currentDate, daysToMove) : subDays(currentDate, daysToMove);
        setCurrentDate(newDate);
    };

    // --- GESTIÓN DE PLANTILLAS (PATRONES) ---
    const saveAsPattern = async () => {
        const patternName = prompt("Nombre para esta plantilla (ej: Turnos Verano):");
        if (!patternName) return;

        setSaving(true);

        // Guardamos solo lo que está en pantalla (filtrado) para evitar mezclar áreas si se desea
        // O guardamos todo. Lo más seguro es guardar lo que corresponde al filtro actual.
        const shiftsToSave = days.map(d => {
            if (selectedAreaId === 'ALL') return d.staffShifts;

            // Filtramos el objeto de turnos para guardar solo los del área activa
            const filteredShifts: Record<string, string> = {};
            Object.entries(d.staffShifts).forEach(([staffId, tmplId]) => {
                const staff = staffList.find(s => s.id === staffId);
                if (staff?.area_ids?.includes(selectedAreaId)) {
                    filteredShifts[staffId] = tmplId;
                }
            });
            return filteredShifts;
        });

        const { error } = await supabase.from('saved_patterns').insert({
            name: patternName,
            area: selectedAreaId === 'ALL' ? 'General' : areas.find(a => a.id === selectedAreaId)?.name,
            shift_data: shiftsToSave
        });

        if (error) toast.error('Error al guardar plantilla');
        else toast.success('Plantilla guardada en la nube');
        setSaving(false);
    };

    // --- MANEJO DE DRAG & DROP ---
    const handleDragStart = (e: DragStartEvent) => {
        if (e.active.data.current?.staff) setActiveStaff(e.active.data.current.staff);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveStaff(null);
        const { active, over } = e;
        if (!over || !active.data.current?.staff) return;

        const { dayIdx, day } = over.data.current as { dayIdx: number, day: DaySchedule };
        const staff = active.data.current.staff as Staff;

        if (day.status !== 'OPEN') return toast.error('Día cerrado');
        if (!templates.length) return toast.error('Crea plantillas primero');

        const newDays = [...days];
        // Asignamos el primer template por defecto (luego se puede rotar con click)
        newDays[dayIdx].staffShifts[staff.id] = templates[0].id;
        setDays(newDays);
    };

    const handleDayAction = (action: string, idx: number) => {
        if (action === 'toggle') {
            const newDays = [...days];
            newDays[idx].status = newDays[idx].status === 'OPEN' ? 'CLOSED' : 'OPEN';
            setDays(newDays);
        }
        if (action === 'clear') {
            setConfirmDialog({
                isOpen: true,
                title: 'Limpiar turnos',
                message: '¿Deseas eliminar todos los turnos de este día?',
                variant: 'danger',
                onConfirm: () => {
                    const newDays = [...days];
                    newDays[idx].staffShifts = {};
                    setDays(newDays);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Turnos eliminados');
                }
            });
        }
        if (action === 'copy_prev' && idx > 0) {
            const newDays = [...days];
            newDays[idx].staffShifts = { ...newDays[idx - 1].staffShifts };
            setDays(newDays);
            toast.success('Copiado del día anterior');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = days.map(d => ({
            date: d.date,
            status: d.status,
            staff_shifts: d.staffShifts
        }));
        const { error } = await supabase.from('availability_schedule').upsert(payload, { onConflict: 'date' });
        if (error) toast.error('Error al guardar');
        else toast.success('Cambios guardados');
        setSaving(false);
    };


    // --- MODAL DE CARGAR PLANTILLA ---
    const PatternModal = () => {
        const [patterns, setPatterns] = useState<any[]>([]);
        const [loadingPat, setLoadingPat] = useState(true);

        useEffect(() => {
            supabase.from('saved_patterns').select('*').order('created_at', { ascending: false })
                .then(({ data }) => { setPatterns(data || []); setLoadingPat(false); });
        }, []);

        const applyPattern = (p: any) => {
            setConfirmDialog({
                isOpen: true,
                title: 'Aplicar plantilla',
                message: `¿Deseas aplicar la plantilla "${p.name}"? Los turnos actuales se fusionarán.`,
                onConfirm: () => {
                    const newDays = days.map((d, i) => {
                        if (i >= p.shift_data.length) return d;
                        return { ...d, staffShifts: { ...d.staffShifts, ...p.shift_data[i] } };
                    });
                    setDays(newDays);
                    setShowPatternModal(false);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Plantilla aplicada');
                }
            });
        };

        const deletePattern = (id: string, name: string) => {
            setConfirmDialog({
                isOpen: true,
                title: 'Eliminar plantilla',
                message: `¿Eliminar "${name}" permanentemente?`,
                variant: 'danger',
                onConfirm: () => {
                    supabase.from('saved_patterns').delete().eq('id', id).then(() => {
                        setPatterns(prev => prev.filter(x => x.id !== id));
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        toast.success('Plantilla eliminada');
                    });
                }
            });
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md p-0 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><DownloadCloud className="text-blue-600" /> Cargar Plantilla</h3>
                        <button onClick={() => setShowPatternModal(false)}><X className="text-slate-400" /></button>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-2 flex-1">
                        {loadingPat && <Loader2 className="animate-spin mx-auto text-blue-500" />}
                        {!loadingPat && patterns.length === 0 && <p className="text-center text-slate-400 text-sm">No hay plantillas guardadas.</p>}
                        {patterns.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-slate-50 transition-colors group">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                    <div className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded w-fit">{p.area}</div>
                                </div>
                                <div className="flex gap-2 opacity-60 group-hover:opacity-100">
                                    <button onClick={() => applyPattern(p)} className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Download size={14} /></button>
                                    <button onClick={() => deletePattern(p.id, p.name)} className="p-2 text-slate-300 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col bg-white">

                {/* TOOLBAR */}
                <header className="h-auto py-3 px-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex flex-col gap-3 md:flex-row md:items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft size={18} className="text-slate-600" /></button>
                            <button onClick={() => navigateDate('next')} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight size={18} className="text-slate-600" /></button>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}
                            </h1>
                            <p className="text-xs text-slate-500 hidden md:block">
                                Del {format(currentDate, 'dd')} al {format(addDays(currentDate, 13), 'dd MMM')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {/* Tabs de Áreas con Colores */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            <button
                                onClick={() => setSelectedAreaId('ALL')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${selectedAreaId === 'ALL'
                                    ? 'bg-white shadow text-slate-800'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Todos
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                                    {staffList.length}
                                </span>
                            </button>
                            {areas.map(area => {
                                const color = AREA_COLORS[area.color] || AREA_COLORS.blue;
                                const count = staffList.filter(s => s.area_ids?.includes(area.id)).length;
                                return (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedAreaId(area.id)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${selectedAreaId === area.id
                                            ? `bg-white shadow ${color.text}`
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${color.bg} ${color.border} border`}></span>
                                        {area.name}
                                        <span className={`${color.bg} ${color.text} px-1.5 py-0.5 rounded-full text-[10px]`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Botón Domingos */}
                        <button
                            onClick={toggleSundays}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${sundaysBlocked
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                                }`}
                            title={sundaysBlocked ? 'Domingos bloqueados' : 'Domingos habilitados'}
                        >
                            {sundaysBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                            <span className="text-xs font-bold">Dom</span>
                        </button>

                        {/* Modos */}
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
                            <button onClick={() => setViewMode('edit')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'edit' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Editor</button>
                            <button onClick={() => setViewMode('preview')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'preview' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Preview</button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {viewMode === 'edit' && (
                            <>
                                <button onClick={() => setShowPatternModal(true)} title="Cargar Plantilla" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><DownloadCloud size={20} /></button>
                                <button onClick={saveAsPattern} title="Guardar Plantilla" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><BookmarkPlus size={20} /></button>
                            </>
                        )}
                        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span className="hidden sm:inline">Guardar</span>
                        </button>
                    </div>
                </header>

                {/* AREA DE TRABAJO */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Personal */}
                    {viewMode === 'edit' && (
                        <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col z-10 shadow-lg">
                            <div className="p-4 border-b border-slate-200 bg-white">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <User size={16} /> Personal
                                    <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {filteredStaff.length}
                                    </span>
                                </h2>
                                {selectedAreaId !== 'ALL' && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        Área: {areas.find(a => a.id === selectedAreaId)?.name}
                                    </p>
                                )}
                            </div>

                            {/* Quick Actions */}
                            {selectedAreaId !== 'ALL' && templates.length > 0 && (
                                <div className="p-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Acción Rápida</p>
                                    <button
                                        onClick={() => {
                                            if (filteredStaff.length === 0) return toast.error('No hay personal en esta área');
                                            const newDays = days.map(d => {
                                                if (d.status !== 'OPEN') return d;
                                                const shifts = { ...d.staffShifts };
                                                filteredStaff.forEach(s => {
                                                    if (!shifts[s.id]) shifts[s.id] = templates[0].id;
                                                });
                                                return { ...d, staffShifts: shifts };
                                            });
                                            setDays(newDays);
                                            toast.success(`${filteredStaff.length} empleados asignados`);
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Users size={14} />
                                        Llenar toda el área
                                    </button>
                                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                                        Usa plantilla: <strong>{templates[0]?.name}</strong>
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {filteredStaff.map(staff => <DraggableStaff key={staff.id} staff={staff} areas={areas} />)}
                                {filteredStaff.length === 0 && <div className="text-center p-4 text-slate-400 text-xs">No hay personal en esta área.</div>}
                            </div>
                        </div>
                    )}

                    {/* Grid Calendario */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-white relative">
                        <div className="flex h-full min-w-max">
                            {days.map((day, idx) => (
                                <div key={day.date} className="w-[200px] h-full group border-r border-slate-100">
                                    <DroppableColumn
                                        day={day}
                                        dayIdx={idx}
                                        staffList={filteredStaff} // Pasamos la lista filtrada
                                        templates={templates}
                                        viewMode={viewMode}
                                        onCycleShift={(i, sId) => {
                                            const newDays = [...days];
                                            const currentTmplId = newDays[i].staffShifts[sId];
                                            const currentIdx = templates.findIndex(t => t.id === currentTmplId);
                                            const nextIdx = (currentIdx + 1) % templates.length;
                                            newDays[i].staffShifts[sId] = templates[nextIdx].id;
                                            setDays(newDays);
                                        }}
                                        onRemoveShift={(i, sId) => {
                                            const newDays = [...days];
                                            delete newDays[i].staffShifts[sId];
                                            setDays(newDays);
                                        }}
                                        onDayAction={handleDayAction}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overlays */}
                {showPatternModal && <PatternModal />}
                <DragOverlay>
                    {activeStaff && (
                        <div className="bg-white p-3 rounded-lg shadow-2xl border-2 border-blue-500 w-48 rotate-3 cursor-grabbing flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                {activeStaff.full_name.substring(0, 1)}
                            </div>
                            <span className="font-bold text-slate-800">{activeStaff.full_name}</span>
                        </div>
                    )}
                </DragOverlay>

                {/* Modal de Confirmación */}
                <ConfirmModal
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    variant={confirmDialog.variant}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        </DndContext>
    );
}