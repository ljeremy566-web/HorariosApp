import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    User, Copy, Trash2, ChevronLeft, ChevronRight,
    BookmarkPlus, DownloadCloud, X, Download, Check, Palette, Wand2, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Staff, Area, ShiftTemplate } from '../types';

// --- TYPES ---
interface DaySchedule {
    date: string;
    dayName: string;
    dayNumber: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staffShifts: Record<string, string>;
}

// Colores para áreas - mapeo robusto que coincide con AreasPage
const AREA_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', border: 'border-rose-500' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', border: 'border-cyan-500' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', border: 'border-teal-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-500' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500', border: 'border-pink-500' },
};

// Color por defecto para áreas sin color definido
const DEFAULT_AREA_COLOR = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-400' };

// Helper para obtener color de área de forma segura
const getAreaColor = (colorName: string | undefined) => {
    if (!colorName) return DEFAULT_AREA_COLOR;
    return AREA_COLORS[colorName] || DEFAULT_AREA_COLOR;
};

// Colores visuales para los turnos (Google Calendar style)
const COLORS: Record<string, { bg: string; text: string; accent: string }> = {
    blue: { bg: 'bg-blue-100/80', text: 'text-blue-900', accent: 'bg-blue-500' },
    orange: { bg: 'bg-orange-100/80', text: 'text-orange-900', accent: 'bg-orange-500' },
    purple: { bg: 'bg-violet-100/80', text: 'text-violet-900', accent: 'bg-violet-500' },
    green: { bg: 'bg-emerald-100/80', text: 'text-emerald-900', accent: 'bg-emerald-500' },
    red: { bg: 'bg-rose-100/80', text: 'text-rose-900', accent: 'bg-rose-500' },
    cyan: { bg: 'bg-cyan-100/80', text: 'text-cyan-900', accent: 'bg-cyan-500' },
};

// --- MODAL DE CONFIRMACIÓN (Google Style) ---
function ConfirmModal({
    isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'default'
}: {
    isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
    confirmText?: string; cancelText?: string; variant?: 'default' | 'danger';
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-backdrop-fade">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-modal-scale">
                <div className="p-6">
                    <h3 className="font-medium text-xl text-slate-900 mb-3">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
                </div>
                <div className="flex justify-end gap-2 px-6 pb-6">
                    <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${variant === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE DRAGGABLE (EMPLEADO) - Sidebar Style ---
function DraggableStaff({ staff, areas, shiftCount }: { staff: Staff; areas: Area[]; shiftCount?: number }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `staff-${staff.id}`, data: { staff } });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const staffArea = staff.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
    const areaColor = getAreaColor(staffArea?.color);

    // Indicador visual si no tiene turnos
    const hasShifts = shiftCount !== undefined && shiftCount > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                flex items-center gap-3 px-3 py-3 mx-2 my-1 rounded-xl 
                cursor-grab active:cursor-grabbing select-none 
                transition-all duration-200 ease-out
                border ${areaColor.border.replace('border-', 'border-opacity-20 border-')}
                ${areaColor.bg} hover:shadow-md hover:border-opacity-60
                active:scale-[0.98]
                ${isDragging ? 'opacity-40 scale-105 shadow-xl z-50' : ''}
            `}
        >
            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${areaColor.dot} text-white`}>
                {staff.full_name.substring(0, 1).toUpperCase()}
                {!hasShifts && shiftCount !== undefined && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Sin turnos asignados"></span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <div className={`text-sm font-medium truncate ${areaColor.text}`}>
                        {staff.full_name}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    {staffArea && (
                        <span className={`text-[11px] truncate ${areaColor.text} opacity-75`}>
                            {staffArea.name}
                        </span>
                    )}
                    {shiftCount !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hasShifts ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-600'}`}>
                            {hasShifts ? (shiftCount === 1 ? '1 turno' : `${shiftCount} turnos`) : 'Sin turno'}
                        </span>
                    )}
                </div>
            </div>
            <GripVertical size={14} className={`${areaColor.text} opacity-40`} />
        </div>
    );
}

// --- COMPONENTE DRAGGABLE (TURNO ASIGNADO) - Calendar Style ---
function DraggableAssignedShift({
    staff, template, staffArea, dayIdx, viewMode, onShiftClick, onRemoveShift
}: {
    staff: Staff; template: ShiftTemplate; staffArea: Area | null; dayIdx: number;
    viewMode: 'edit' | 'preview';
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
}) {
    // ID único para re-scheduling: assigned-{dayIdx}-{staffId}
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `assigned-${dayIdx}-${staff.id}`,
        data: { type: 'assigned-shift', staffId: staff.id, templateId: template.id, sourceDayIdx: dayIdx, staff },
        disabled: viewMode !== 'edit'
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;
    const areaColor = getAreaColor(staffArea?.color);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => {
                if (viewMode === 'edit') onShiftClick(dayIdx, staff.id);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                if (viewMode === 'edit') onRemoveShift(dayIdx, staff.id);
            }}
            className={`
                relative px-3 py-2.5 rounded-xl cursor-pointer active:cursor-grabbing
                transition-all duration-150 ease-out
                ${areaColor.bg} ${areaColor.text}
                border ${areaColor.border.replace('border-', 'border-opacity-30 border-')}
                hover:shadow-md hover:scale-[1.01] active:scale-[0.98] hover:border-opacity-80
                ${isDragging ? 'opacity-30' : ''}
            `}
        >
            <div className="font-semibold text-sm flex justify-between items-center gap-2">
                <span className="truncate">{staff.full_name}</span>
                {template && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${areaColor.dot} text-white flex-shrink-0`}>
                        {template.code}
                    </span>
                )}
            </div>
            {template?.schedule_config && (
                <div className="text-xs mt-1.5 opacity-80 flex items-center gap-1.5">
                    <Clock size={12} className="flex-shrink-0" />
                    <span className="font-medium">
                        {template.schedule_config[0]?.start} - {template.schedule_config[template.schedule_config.length - 1]?.end}
                    </span>
                </div>
            )}
        </div>
    );
}

// --- COMPONENTE DROPPABLE (COLUMNA DE DÍA) - Google Calendar Style ---
function DroppableColumn({ day, dayIdx, staffList, templates, areas, viewMode, onShiftClick, onRemoveShift, onDayAction }: {
    day: DaySchedule; dayIdx: number; staffList: Staff[]; templates: ShiftTemplate[]; areas: Area[];
    viewMode: 'edit' | 'preview';
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
    onDayAction: (action: 'copy_prev' | 'clear' | 'toggle', idx: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id: `day-${day.date}`, data: { dayIdx, day } });

    const visibleAssignments = Object.entries(day.staffShifts as Record<string, string>).map(([staffId, templateId]) => {
        const staff = staffList.find((s: Staff) => s.id === staffId);
        const template = templates.find((t: ShiftTemplate) => t.id === templateId);
        // Obtener el área del empleado para usar su color
        const staffArea = staff?.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
        return { staffId, staff, template, staffArea };
    }).filter(a => a.staff);

    const isToday = isSameDay(new Date(day.date + 'T00:00:00'), new Date());
    const isClosed = day.status !== 'OPEN';

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[160px] flex-1 flex flex-col h-full transition-all duration-200
                ${isClosed ? 'bg-slate-50/80' : (isOver ? 'bg-blue-50/50' : 'bg-white')}
            `}
        >
            {/* Header del día - Google Calendar style */}
            <div className={`
                sticky top-0 z-10 p-3 text-center transition-colors border-b border-slate-100
                ${isToday ? 'bg-white' : 'bg-white'} 
                ${isClosed ? 'opacity-50' : ''}
            `}>
                <div className={`text-[11px] font-medium uppercase tracking-wide mb-2 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {day.dayName.substring(0, 3)}
                </div>
                <div className={`
                    text-xl font-normal inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors
                    ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}
                `}>
                    {day.dayNumber}
                </div>

                {/* Acciones del día - aparecen en hover */}
                {viewMode === 'edit' && (
                    <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onDayAction('toggle', dayIdx)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            title={isClosed ? 'Abrir día' : 'Cerrar día'}
                        >
                            {isClosed ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                        {dayIdx > 0 && !isClosed && (
                            <button
                                onClick={() => onDayAction('copy_prev', dayIdx)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                title="Copiar día anterior"
                            >
                                <Copy size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => onDayAction('clear', dayIdx)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Limpiar día"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Body - Lista de turnos */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {!isClosed ? (
                    visibleAssignments.length > 0 ? (
                        visibleAssignments.map(({ staffId, staff, template, staffArea }: any) => (
                            <DraggableAssignedShift
                                key={staffId}
                                staff={staff}
                                template={template}
                                staffArea={staffArea}
                                dayIdx={dayIdx}
                                viewMode={viewMode}
                                onShiftClick={onShiftClick}
                                onRemoveShift={onRemoveShift}
                            />
                        ))
                    ) : (
                        viewMode === 'edit' && (
                            <div className="h-20 flex items-center justify-center text-slate-300 border border-dashed border-slate-200 rounded-lg">
                                <span className="text-[11px]">Vacío</span>
                            </div>
                        )
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <Lock size={20} className="mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Cerrado</span>
                    </div>
                )}
            </div>

            {/* Footer - Contador */}
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <span className={`text-[10px] font-medium uppercase tracking-wide ${visibleAssignments.length > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                    {visibleAssignments.length} {visibleAssignments.length === 1 ? 'asignado' : 'asignados'}
                </span>
            </div>
        </div>
    );
}

// --- MAIN PAGE ---
export default function SchedulerPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
    const [showPatternModal, setShowPatternModal] = useState(false);
    const [sundaysBlocked, setSundaysBlocked] = useState(true);

    // Estado del "Pincel" (NULL = modo manual/rotar)
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);
    const [activeDragData, setActiveDragData] = useState<any>(null);

    // Calcular conteo de turnos por empleado para el mes visible
    // Esto se recalcula cuando cambian los días o la lista de staff
    const staffShiftCounts = useMemo(() => days.reduce((acc, day) => {
        Object.keys(day.staffShifts).forEach(staffId => {
            acc[staffId] = (acc[staffId] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>), [days]);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'default' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const filteredStaff = selectedAreaId === 'ALL' ? staffList : staffList.filter(s => s.area_ids && s.area_ids.includes(selectedAreaId));

    useEffect(() => { loadData(); }, [currentDate]);

    const toggleSundays = () => {
        const newState = !sundaysBlocked;
        setSundaysBlocked(newState);
        setDays(days.map(d => {
            const date = new Date(d.date + 'T12:00:00');
            if (date.getDay() === 0) {
                return { ...d, status: newState ? 'DISABLED_BY_RULE' as const : 'OPEN' as const };
            }
            return d;
        }));
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

            setTemplates(tmplRes.data || []);

            const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

            const { data: schedule } = await supabase
                .from('availability_schedule')
                .select('*')
                .gte('date', startStr)
                .lte('date', endStr);

            generateGrid(schedule || [], currentDate);
        } catch (e) { toast.error('Error cargando datos'); } finally { setLoading(false); }
    };

    const generateGrid = (dbData: any[], dateInMonth: Date) => {
        const start = startOfMonth(dateInMonth);
        const end = endOfMonth(dateInMonth);
        const daysInMonth = eachDayOfInterval({ start, end });

        const newDays: DaySchedule[] = daysInMonth.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const saved = dbData?.find((s: any) => s.date === dateStr);
            const isSunday = d.getDay() === 0;

            return {
                date: dateStr,
                dayName: format(d, 'EEEE', { locale: es }),
                dayNumber: format(d, 'dd'),
                status: saved?.status || (isSunday && sundaysBlocked ? 'DISABLED_BY_RULE' : 'OPEN'),
                staffShifts: saved?.staff_shifts || {}
            };
        });
        setDays(newDays);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    };

    const saveAsPattern = async () => {
        const patternName = prompt("Nombre de la plantilla:");
        if (!patternName) return;
        setSaving(true);
        const shiftsToSave = days.map(d => {
            if (selectedAreaId === 'ALL') return d.staffShifts;
            const filteredShifts: Record<string, string> = {};
            Object.entries(d.staffShifts).forEach(([staffId, tmplId]) => {
                const staff = staffList.find(s => s.id === staffId);
                if (staff?.area_ids?.includes(selectedAreaId)) filteredShifts[staffId] = tmplId;
            });
            return filteredShifts;
        });
        await supabase.from('saved_patterns').insert({
            name: patternName,
            area: selectedAreaId === 'ALL' ? 'General' : areas.find(a => a.id === selectedAreaId)?.name,
            shift_data: shiftsToSave
        });
        toast.success('Plantilla guardada');
        setSaving(false);
    };

    const handleDragStart = (e: DragStartEvent) => {
        setActiveDragData(e.active.data.current);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDragData(null);
        const { active, over } = e;

        if (!over) return;
        const targetData = over.data.current as { dayIdx: number, day: DaySchedule };

        // Validación de seguridad para asegurar que el target es válido
        if (!targetData?.day) return;

        const { dayIdx: targetDayIdx, day: targetDay } = targetData;
        if (targetDay.status !== 'OPEN') return toast.error('Día cerrado');

        // --- CASO 1: RE-AGENDAR (Drag desde el calendario) ---
        if (active.data.current?.type === 'assigned-shift') {
            const { staffId, sourceDayIdx, templateId } = active.data.current;

            // Si el destino es el mismo día, no hacemos nada
            if (sourceDayIdx === targetDayIdx) return;

            const newDays = [...days];

            // Mover el turno: Borrar del origen -> Agregar al destino
            delete newDays[sourceDayIdx].staffShifts[staffId];
            newDays[targetDayIdx].staffShifts[staffId] = templateId;

            setDays(newDays);
            return;
        }

        // --- CASO 2: ASIGNAR NUEVO (Drag desde sidebar) ---
        if (!active.data.current?.staff) return;
        const staff = active.data.current.staff as Staff;

        if (templates.length === 0) return toast.error('Crea plantillas primero');

        const newDays = [...days];
        const templateToUse = activeTemplateId || templates[0].id; // Usar template seleccionado o el primero

        newDays[targetDayIdx].staffShifts[staff.id] = templateToUse;
        setDays(newDays);
    };

    const onShiftClick = (i: number, sId: string) => {
        const newDays = [...days];

        if (activeTemplateId) {
            if (newDays[i].staffShifts[sId] !== activeTemplateId) {
                newDays[i].staffShifts[sId] = activeTemplateId;
                setDays(newDays);
            }
        } else {
            if (templates.length === 0) return;
            const currentTmplId = newDays[i].staffShifts[sId];
            const currentIdx = templates.findIndex(t => t.id === currentTmplId);
            const nextIdx = (currentIdx + 1) % templates.length;
            newDays[i].staffShifts[sId] = templates[nextIdx].id;
            setDays(newDays);
        }
    };

    const toggleTemplateSelection = (templateId: string) => {
        setActiveTemplateId(activeTemplateId === templateId ? null : templateId);
    };

    const handleDayAction = (action: string, idx: number) => {
        const newDays = [...days];
        if (action === 'toggle') {
            newDays[idx].status = newDays[idx].status === 'OPEN' ? 'CLOSED' : 'OPEN';
            setDays(newDays);
        }
        if (action === 'clear') {
            setConfirmDialog({
                isOpen: true,
                title: 'Limpiar turnos',
                message: '¿Eliminar todos los turnos de este día?',
                variant: 'danger',
                onConfirm: () => {
                    const nd = [...days];
                    nd[idx].staffShifts = {};
                    setDays(nd);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Turnos eliminados');
                }
            });
        }
        if (action === 'copy_prev' && idx > 0) {
            newDays[idx].staffShifts = { ...newDays[idx - 1].staffShifts };
            setDays(newDays);
            toast.success('Copiado del día anterior');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = days.map(d => ({ date: d.date, status: d.status, staff_shifts: d.staffShifts }));
            const { error } = await supabase.from('availability_schedule').upsert(payload, { onConflict: 'date' });

            if (error) throw error;

            toast.success('Cambios guardados correctamente');
        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Ocurrió un error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // Auto-fill - Usa el turno activo o el primero disponible
    const autoFill = () => {
        if (templates.length === 0) return toast.error("Crea plantillas primero");
        const templateToUse = activeTemplateId || templates[0].id;
        const newDays = days.map(d => {
            if (d.status !== 'OPEN') return d;
            const shifts = { ...d.staffShifts };
            filteredStaff.forEach(s => { if (!shifts[s.id]) shifts[s.id] = templateToUse; });
            return { ...d, staffShifts: shifts };
        });
        setDays(newDays);
        toast.success('Relleno completado');
    };

    // --- MODAL DE PLANTILLAS ---
    const PatternModal = () => {
        const [patterns, setPatterns] = useState<any[]>([]);
        const [loadingPat, setLoadingPat] = useState(true);

        useEffect(() => {
            supabase.from('saved_patterns').select('*').order('created_at', { ascending: false })
                .then(({ data }) => { setPatterns(data || []); setLoadingPat(false); });
        }, []);

        const apply = (p: any) => {
            setConfirmDialog({
                isOpen: true,
                title: 'Aplicar plantilla',
                message: `¿Aplicar "${p.name}" al calendario actual ? `,
                onConfirm: () => {
                    const newDays = days.map((d, i) => i < p.shift_data.length ? { ...d, staffShifts: { ...d.staffShifts, ...p.shift_data[i] } } : d);
                    setDays(newDays);
                    setShowPatternModal(false);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Plantilla aplicada');
                }
            });
        };

        const remove = (id: string, name: string) => {
            setConfirmDialog({
                isOpen: true,
                title: 'Eliminar plantilla',
                message: `¿Eliminar "${name}" permanentemente ? `,
                variant: 'danger',
                onConfirm: () => {
                    supabase.from('saved_patterns').delete().eq('id', id).then(() => {
                        setPatterns(patterns.filter(p => p.id !== id));
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        toast.success('Plantilla eliminada');
                    });
                }
            });
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-backdrop-fade">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-modal-scale flex flex-col max-h-[80vh]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-medium text-lg text-slate-800 flex items-center gap-2">
                            <DownloadCloud size={20} className="text-blue-600" />
                            Cargar Plantilla
                        </h3>
                        <button onClick={() => setShowPatternModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loadingPat && <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                        {!loadingPat && patterns.length === 0 && (
                            <div className="py-8 text-center text-slate-400">
                                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay plantillas guardadas</p>
                            </div>
                        )}
                        {patterns.map(p => (
                            <div key={p.id} className="flex justify-between p-4 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50/50 transition-all items-center group">
                                <div>
                                    <div className="font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{p.area}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => apply(p)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                                        <Download size={16} />
                                    </button>
                                    <button onClick={() => remove(p.id, p.name)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="text-sm text-slate-500">Cargando horarios...</span>
            </div>
        </div>
    );

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-full flex flex-col bg-slate-50/50">

                {/* === HEADER PRINCIPAL === */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                    {/* Fila 1: Navegación + Título + Acciones */}
                    <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            {/* Navegación */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => navigateDate('prev')}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-slate-700" />
                                </button>
                                <button
                                    onClick={() => navigateDate('next')}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ChevronRight size={20} className="text-slate-700" />
                                </button>
                            </div>

                            {/* Título */}
                            <div>
                                <h1 className="text-xl font-normal text-slate-800">
                                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {format(currentDate, 'dd')} - {format(addDays(currentDate, 13), 'dd MMM')}
                                </p>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                            {viewMode === 'edit' && (
                                <>
                                    <button
                                        onClick={() => setShowPatternModal(true)}
                                        title="Cargar plantilla"
                                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <DownloadCloud size={20} />
                                    </button>
                                    <button
                                        onClick={saveAsPattern}
                                        title="Guardar como plantilla"
                                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <BookmarkPlus size={20} />
                                    </button>
                                    <button
                                        onClick={autoFill}
                                        title="Rellenar vacíos automáticamente"
                                        className="p-2.5 text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                                    >
                                        <Wand2 size={20} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="ml-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                <span className="hidden sm:inline">Guardar</span>
                            </button>
                        </div>
                    </div>

                    {/* Fila 2: Filtros y controles */}
                    <div className="px-5 py-2.5 border-t border-slate-100 flex items-center gap-4 overflow-x-auto bg-slate-50/50">
                        {/* Áreas */}
                        <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm border border-slate-200">
                            <button
                                onClick={() => setSelectedAreaId('ALL')}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selectedAreaId === 'ALL'
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Todos
                                <span className="ml-1.5 opacity-70">{staffList.length}</span>
                            </button>
                            {areas.map(area => {
                                const color = AREA_COLORS[area.color] || AREA_COLORS.blue;
                                const count = staffList.filter(s => s.area_ids?.includes(area.id)).length;
                                return (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedAreaId(area.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedAreaId === area.id
                                            ? `${color.bg} ${color.text}`
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                                        {area.name}
                                        <span className="opacity-70">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="w-px h-6 bg-slate-200"></div>

                        {/* Domingos */}
                        <button
                            onClick={toggleSundays}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${sundaysBlocked
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}
                        >
                            {sundaysBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                            Dom
                        </button>

                        {/* Editor/Preview */}
                        <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 flex">
                            <button
                                onClick={() => setViewMode('edit')}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === 'edit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Editor
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                Vista
                            </button>
                        </div>
                    </div>
                </header>

                {/* === BARRA DE TURNOS (PINCELES) === */}
                {viewMode === 'edit' && (
                    <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 overflow-x-auto">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5 flex-shrink-0">
                            <Palette size={14} />
                            Turnos
                        </span>

                        <div className="w-px h-5 bg-slate-200"></div>

                        {templates.map(t => {
                            const c = COLORS[t.color] || COLORS.blue;
                            const isActive = activeTemplateId === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => toggleTemplateSelection(t.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all flex-shrink-0
                                        ${isActive
                                            ? `${c.bg} ${c.text} ring-2 ring-offset-1 ${c.accent.replace('bg-', 'ring-')} scale-105`
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }
`}
                                    title={isActive ? 'Clic para deseleccionar' : 'Clic para seleccionar'}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${c.accent}`}></span>
                                    {t.name}
                                    {isActive && <Check size={12} strokeWidth={3} />}
                                </button>
                            );
                        })}

                        {templates.length === 0 && (
                            <span className="text-xs text-orange-500 flex items-center gap-1">
                                ⚠️ Crea plantillas de turno para empezar
                            </span>
                        )}

                        {/* Indicador de modo */}
                        <div className="ml-auto flex-shrink-0">
                            <span className={`
                                text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full
                                ${activeTemplateId
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'bg-slate-100 text-slate-500'
                                }
`}>
                                {activeTemplateId ? '🎨 Pincel' : '🔄 Manual'}
                            </span>
                        </div>
                    </div>
                )}

                {/* === ÁREA DE TRABAJO === */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar - Personal (con agrupación por áreas) */}
                    {viewMode === 'edit' && (
                        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                            <div className="p-4 border-b border-slate-100">
                                <h2 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <User size={16} className="text-slate-400" />
                                    Personal
                                </h2>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {filteredStaff.length} {filteredStaff.length === 1 ? 'persona' : 'personas'}
                                    {selectedAreaId === 'ALL' && areas.length > 0 && ' • Agrupados por área'}
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {selectedAreaId === 'ALL' ? (
                                    // MODO AGRUPADO: mostrar por áreas cuando está en "Todos"
                                    <div className="py-2">
                                        {areas.map(area => {
                                            const areaStaff = staffList.filter(s => s.area_ids?.includes(area.id));
                                            if (areaStaff.length === 0) return null;
                                            const color = getAreaColor(area.color);

                                            return (
                                                <div key={area.id} className="mb-1">
                                                    {/* Header del grupo de área */}
                                                    <div className={`sticky top-0 z-10 px-3 py-2 flex items-center justify-between ${color.bg} backdrop-blur-sm`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                                                            <span className={`text-xs font-semibold ${color.text}`}>{area.name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-medium ${color.text} opacity-70`}>{areaStaff.length}</span>
                                                    </div>
                                                    {/* Lista de empleados del área */}
                                                    <div className="py-1">
                                                        {areaStaff.map(staff => (
                                                            <DraggableStaff key={staff.id} staff={staff} areas={areas} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Empleados sin área asignada */}
                                        {(() => {
                                            const noAreaStaff = staffList.filter(s => !s.area_ids || s.area_ids.length === 0);
                                            if (noAreaStaff.length === 0) return null;
                                            return (
                                                <div className="mb-1">
                                                    <div className="sticky top-0 z-10 px-3 py-2 flex items-center justify-between bg-slate-100">
                                                        <span className="text-xs font-semibold text-slate-500">Sin área asignada</span>
                                                        <span className="text-[10px] font-medium text-slate-400">{noAreaStaff.length}</span>
                                                    </div>
                                                    <div className="py-1">
                                                        {noAreaStaff.map(staff => (
                                                            <DraggableStaff key={staff.id} staff={staff} areas={areas} shiftCount={staffShiftCounts[staff.id] || 0} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    // MODO LISTA: mostrar todos cuando hay un área filtrada
                                    <div className="py-2">
                                        {filteredStaff.map(staff => (
                                            <DraggableStaff key={staff.id} staff={staff} areas={areas} shiftCount={staffShiftCounts[staff.id] || 0} />
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <div className="text-center py-8 text-slate-400">
                                                <User size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-xs">Sin personal en esta área</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grid de Calendario */}
                    <div className="flex-1 overflow-auto bg-white">
                        <div className="flex h-full min-w-max divide-x divide-slate-100">
                            {days.map((day, idx) => (
                                <div key={day.date} className="flex-1 min-w-[180px] h-full group">
                                    <DroppableColumn
                                        day={day}
                                        dayIdx={idx}
                                        staffList={filteredStaff}
                                        templates={templates}
                                        areas={areas}
                                        viewMode={viewMode}
                                        onShiftClick={onShiftClick}
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

                {/* Modales */}
                {showPatternModal && <PatternModal />}

                <DragOverlay dropAnimation={null}>
                    {activeDragData ? (() => {
                        const staff = activeDragData.staff;
                        if (!staff) return null;

                        const area = staff.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
                        const areaColor = getAreaColor(area?.color);
                        const isShift = activeDragData.type === 'assigned-shift';
                        let template = null;
                        if (isShift) {
                            template = templates.find(t => t.id === activeDragData.templateId);
                        }

                        return (
                            <div className={`
                                relative px-3 py-2.5 rounded-xl shadow-2xl scale-105 cursor-grabbing z-50 bg-white
                                ${areaColor.bg} ${areaColor.text}
                                border ${areaColor.border}
                                min-w-[180px] flex items-center gap-3
                            `}>
                                {isShift ? (
                                    <div className="w-full">
                                        <div className="font-semibold text-sm flex justify-between items-center gap-2">
                                            <span className="truncate">{staff.full_name}</span>
                                            {template && (
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${areaColor.dot} text-white flex-shrink-0`}>
                                                    {template.code}
                                                </span>
                                            )}
                                        </div>
                                        {template?.schedule_config && (
                                            <div className="text-xs mt-1.5 opacity-80 flex items-center gap-1.5">
                                                <Clock size={12} className="flex-shrink-0" />
                                                <span className="font-medium">
                                                    {template.schedule_config[0]?.start} - {template.schedule_config[template.schedule_config.length - 1]?.end}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${areaColor.dot} text-white`}>
                                            {staff.full_name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium truncate ${areaColor.text}`}>{staff.full_name}</div>
                                            {area && <div className={`text-[11px] truncate ${areaColor.text} opacity-75`}>{area.name}</div>}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })() : null}
                </DragOverlay>

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