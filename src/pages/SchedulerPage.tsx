import { useState, useEffect, useMemo, useRef } from 'react';
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
    BookmarkPlus, DownloadCloud, X, Download, Check, Palette, Wand2, Calendar,
    Shuffle, AlignJustify, Repeat, Sparkles, CalendarDays, CheckSquare, Square, Eraser
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Staff, Area, ShiftTemplate } from '../types';
import { staffService, areaService, templateService, patternService, availabilityService } from '../Services';
import { AREA_COLORS, SHIFT_COLORS, getAreaColor } from '../constants/colors';

// --- TYPES ---
// Estructura de un turno asignado: guarda el template Y el área en que se creó
interface ShiftAssignment {
    templateId: string;
    areaId: string | null; // null = asignado en modo "Todos"
}

interface DaySchedule {
    date: string;
    dayName: string;
    dayNumber: string;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
    staffShifts: Record<string, string | ShiftAssignment>; // Soporta ambos formatos para compatibilidad
}

// Helper para obtener datos del turno de forma segura (soporta formato antiguo y nuevo)
const getShiftData = (shift: string | ShiftAssignment): ShiftAssignment => {
    if (typeof shift === 'string') {
        // Formato antiguo: solo templateId (migración de datos existentes)
        return { templateId: shift, areaId: null };
    }
    return shift;
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
function DraggableStaff({ staff, areas, shiftCount, contextAreaId }: { staff: Staff; areas: Area[]; shiftCount?: number; contextAreaId?: string }) {
    // ID único: si hay contextAreaId (para multi-área), lo incluimos para evitar duplicados
    const dragId = contextAreaId ? `staff-${staff.id}-${contextAreaId}` : `staff-${staff.id}`;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId, data: { staff } });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    // Usar el área de contexto si se proporciona, o el área principal
    const displayAreaId = contextAreaId || staff.area_ids?.[0];
    const staffArea = displayAreaId ? areas.find(a => a.id === displayAreaId) : null;
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
    // Color del turno (template)
    const templateColor = SHIFT_COLORS[template?.color] || SHIFT_COLORS.blue;

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
            {/* Punto de color del turno (template) */}
            <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${templateColor.accent} shadow-sm`}></div>

            <div className="font-semibold text-sm flex justify-between items-center gap-2 pr-4">
                <span className="truncate">{staff.full_name}</span>
                {template && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${templateColor.accent} text-white flex-shrink-0`}>
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
function DroppableColumn({ day, dayIdx, staffList, templates, areas, viewMode, selectedAreaId, onShiftClick, onRemoveShift, onDayAction }: {
    day: DaySchedule; dayIdx: number; staffList: Staff[]; templates: ShiftTemplate[]; areas: Area[];
    viewMode: 'edit' | 'preview';
    selectedAreaId: string; // 'ALL' o el ID del área filtrada
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
    onDayAction: (action: 'copy_prev' | 'clear' | 'toggle', idx: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id: `day-${day.date}`, data: { dayIdx, day } });

    const visibleAssignments = Object.entries(day.staffShifts).map(([staffId, shiftValue]) => {
        const shiftData = getShiftData(shiftValue);
        const staff = staffList.find((s: Staff) => s.id === staffId);
        const template = templates.find((t: ShiftTemplate) => t.id === shiftData.templateId);
        // Obtener el área del empleado para usar su color
        const staffArea = staff?.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
        return { staffId, staff, template, staffArea, shiftAreaId: shiftData.areaId };
    }).filter(a => {
        // Filtrar: solo mostrar si el empleado Y el template existen
        if (!a.staff || !a.template) return false;

        // Si estamos en modo "Todos", mostrar todos los turnos
        if (selectedAreaId === 'ALL') return true;

        // Si el turno fue creado sin área específica (datos antiguos), 
        // mostrarlo solo si el empleado pertenece al área filtrada
        if (!a.shiftAreaId) {
            return a.staff.area_ids?.includes(selectedAreaId) ?? false;
        }

        // Mostrar solo si el turno fue creado en el área seleccionada
        return a.shiftAreaId === selectedAreaId;
    });

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
    const [showGenerator, setShowGenerator] = useState(false);
    const [sundaysBlocked, setSundaysBlocked] = useState(true);

    // Estados para vista 15/30 días y cambios sin guardar
    const [daysToShow, setDaysToShow] = useState<15 | 30>(30);  // Por defecto mes completo
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Estado del "Pincel" (NULL = modo manual/rotar)
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);
    const [activeDragData, setActiveDragData] = useState<any>(null);

    // Ref para el contenedor del grid y scroll automático al día actual
    const gridContainerRef = useRef<HTMLDivElement>(null);

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

    const loadData = async (daysToLoad: number = daysToShow) => {
        setLoading(true);
        try {
            const [staffData, areasData, tmplData] = await Promise.all([
                staffService.getAll(),
                areaService.getAll(),
                templateService.getAll()
            ]);

            setStaffList(staffData);
            setAreas(areasData);
            setTemplates(tmplData);

            // Calcular rango dinámico basado en daysToLoad
            const today = new Date();
            const startStr = format(today, 'yyyy-MM-dd');
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + daysToLoad - 1);
            const endStr = format(endDate, 'yyyy-MM-dd');

            const schedule = await availabilityService.getByDateRange(startStr, endStr);

            generateGrid(schedule, today, daysToLoad);
        } catch (e) { toast.error('Error cargando datos'); } finally { setLoading(false); }
    };

    const generateGrid = (dbData: any[], startDate: Date, count: number) => {
        const newDays: DaySchedule[] = [];

        for (let i = 0; i < count; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const saved = dbData?.find((s: any) => s.date === dateStr);
            const isSunday = d.getDay() === 0;

            newDays.push({
                date: dateStr,
                dayName: format(d, 'EEEE', { locale: es }),
                dayNumber: format(d, 'dd'),
                status: saved?.status || (isSunday && sundaysBlocked ? 'DISABLED_BY_RULE' : 'OPEN'),
                staffShifts: saved?.staff_shifts || {}
            });
        }
        setDays(newDays);
    };

    // Cargar datos cuando cambia daysToShow o domingos
    useEffect(() => {
        loadData(daysToShow);
    }, [daysToShow, sundaysBlocked]);

    // Scroll automático al día actual después de cargar
    useEffect(() => {
        if (!loading && days.length > 0 && gridContainerRef.current) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const todayElement = gridContainerRef.current.querySelector(`[data-date="${today}"]`);
            if (todayElement) {
                setTimeout(() => {
                    todayElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }, 100);
            }
        }
    }, [loading, days.length]);

    const navigateDate = (direction: 'prev' | 'next') => {
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    };

    const saveAsPattern = async () => {
        const patternName = prompt("Nombre de la plantilla:");
        if (!patternName) return;
        setSaving(true);
        const shiftsToSave = days.map(d => {
            if (selectedAreaId === 'ALL') return d.staffShifts;
            const filteredShifts: Record<string, string | ShiftAssignment> = {};
            Object.entries(d.staffShifts).forEach(([staffId, shiftValue]) => {
                const shiftData = getShiftData(shiftValue);
                const staff = staffList.find(s => s.id === staffId);
                if (shiftData.areaId === selectedAreaId ||
                    (!shiftData.areaId && staff?.area_ids?.includes(selectedAreaId))) {
                    filteredShifts[staffId] = shiftValue;
                }
            });
            return filteredShifts;
        });
        try {
            await patternService.create({
                name: patternName,
                area: selectedAreaId === 'ALL' ? 'General' : areas.find(a => a.id === selectedAreaId)?.name || 'General',
                shift_data: shiftsToSave
            });
            toast.success('Plantilla guardada');
        } catch (e) {
            toast.error('Error guardando plantilla');
        }
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
            const { staffId, sourceDayIdx, staff: draggedStaff } = active.data.current;

            // Si el destino es el mismo día, no hacemos nada
            if (sourceDayIdx === targetDayIdx) return;

            const newDays = [...days];

            // Obtener el turno existente para preservar su areaId
            const existingShift = newDays[sourceDayIdx].staffShifts[staffId];

            // Mover el turno: Borrar del origen -> Agregar al destino
            delete newDays[sourceDayIdx].staffShifts[staffId];
            newDays[targetDayIdx].staffShifts[staffId] = existingShift;

            setDays(newDays);
            toast.success(`Turno de ${draggedStaff?.full_name || 'empleado'} movido al día ${targetDay.dayNumber}`);
            return;
        }

        // --- CASO 2: ASIGNAR NUEVO (Drag desde sidebar) ---
        if (!active.data.current?.staff) return;
        const staff = active.data.current.staff as Staff;

        if (templates.length === 0) return toast.error('Crea plantillas primero');

        const newDays = [...days];
        const templateToUse = activeTemplateId || templates[0].id;

        // IMPORTANTE: Guardar el turno con el área actualmente seleccionada
        // Si estamos en "Todos", usar el área principal del empleado
        const areaToSave = selectedAreaId !== 'ALL' ? selectedAreaId : (staff.area_ids?.[0] || null);

        newDays[targetDayIdx].staffShifts[staff.id] = {
            templateId: templateToUse,
            areaId: areaToSave
        };
        setDays(newDays);
        setHasUnsavedChanges(true);  // Marcar cambios pendientes

        // Notificación con nombre del template usado
        const templateUsed = templates.find(t => t.id === templateToUse);
        toast.success(`${staff.full_name} asignado al día ${targetDay.dayNumber} (${templateUsed?.name || 'turno'})`);
    };

    const onShiftClick = (i: number, sId: string) => {
        const newDays = [...days];
        const currentShift = getShiftData(newDays[i].staffShifts[sId]);
        const staff = staffList.find(s => s.id === sId);

        if (activeTemplateId) {
            if (currentShift.templateId !== activeTemplateId) {
                // Preservar areaId, solo cambiar templateId
                newDays[i].staffShifts[sId] = {
                    templateId: activeTemplateId,
                    areaId: currentShift.areaId
                };
                setDays(newDays);
                setHasUnsavedChanges(true);
                const newTemplate = templates.find(t => t.id === activeTemplateId);
                toast.success(`Turno cambiado a ${newTemplate?.name || 'nuevo turno'}`);
            }
        } else {
            if (templates.length === 0) return;
            const currentIdx = templates.findIndex(t => t.id === currentShift.templateId);
            const nextIdx = (currentIdx + 1) % templates.length;
            // Preservar areaId, rotar templateId
            newDays[i].staffShifts[sId] = {
                templateId: templates[nextIdx].id,
                areaId: currentShift.areaId
            };
            setDays(newDays);
            setHasUnsavedChanges(true);
            toast.success(`${staff?.full_name || 'Empleado'} → ${templates[nextIdx].name}`);
        }
    };

    const toggleTemplateSelection = (templateId: string) => {
        setActiveTemplateId(activeTemplateId === templateId ? null : templateId);
    };

    const handleDayAction = (action: string, idx: number) => {
        const newDays = [...days];
        if (action === 'toggle') {
            // Manejar los 3 estados: OPEN, CLOSED, DISABLED_BY_RULE
            if (newDays[idx].status === 'OPEN') {
                newDays[idx].status = 'CLOSED';
            } else {
                // Tanto CLOSED como DISABLED_BY_RULE se abren
                newDays[idx].status = 'OPEN';
            }
            setDays(newDays);
            setHasUnsavedChanges(true);
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
                    setHasUnsavedChanges(true);
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
        const toastId = toast.loading('Guardando cambios...');
        try {
            const payload = days.map(d => ({ date: d.date, status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE', staff_shifts: d.staffShifts }));
            await availabilityService.upsertSchedule(payload);

            const totalShifts = days.reduce((acc, d) => acc + Object.keys(d.staffShifts).length, 0);
            toast.success(`¡Guardado! ${totalShifts} turnos en ${days.length} días`, { id: toastId });
            setHasUnsavedChanges(false);  // Limpiar bandera de cambios
        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Error al guardar los cambios', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // --- CAMBIO DE VISTA CON GUARD DE CAMBIOS SIN GUARDAR ---
    const changeViewMode = (mode: 15 | 30) => {
        if (mode === daysToShow) return;

        if (hasUnsavedChanges) {
            setConfirmDialog({
                isOpen: true,
                title: 'Cambios sin guardar',
                message: 'Tienes cambios pendientes. Si cambias de vista ahora, perderás tu trabajo actual. ¿Deseas continuar?',
                variant: 'danger',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setHasUnsavedChanges(false);
                    setDaysToShow(mode);
                }
            });
        } else {
            setDaysToShow(mode);
        }
    };

    // --- BOTÓN DE PÁNICO: LIMPIAR HORARIO ---
    const handleClearSchedule = () => {
        const hasShifts = days.some(day => Object.keys(day.staffShifts).length > 0);

        if (!hasShifts) {
            toast('✨ El horario ya está limpio', { icon: '🧹' });
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Limpiar horario completo',
            message: '¿Estás seguro de que quieres LIMPIAR todas las asignaciones visibles? Esta acción no se puede deshacer.',
            variant: 'danger',
            onConfirm: () => {
                const newDays = days.map(day => {
                    if (day.status !== 'OPEN') return day;
                    return { ...day, staffShifts: {} };
                });
                setDays(newDays);
                setHasUnsavedChanges(true);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                toast.success('Horario limpiado. Recuerda guardar si quieres hacerlo permanente.');
            }
        });
    };

    // --- SCHEDULE GENERATION LOGIC ---
    const handleGenerateSchedule = (
        mode: 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK',
        selectedIds: string[]
    ) => {
        const newDays = days.map((day, dayIndex) => {
            if (day.status !== 'OPEN') return day;
            const newShifts = { ...day.staffShifts };

            filteredStaff.forEach((staff, staffIndex) => {
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

                if (templateId) {
                    const areaToSave = selectedAreaId !== 'ALL' ? selectedAreaId : (staff.area_ids?.[0] || null);
                    newShifts[staff.id] = { templateId, areaId: areaToSave };
                }
            });
            return { ...day, staffShifts: newShifts };
        });

        setDays(newDays);
        setShowGenerator(false);
        toast.success('¡Horario generado mágicamente! ✨');
    };
    // --- GENERATOR MODAL (Google Material You Style) ---
    const GeneratorModal = () => {
        const [mode, setMode] = useState<'UNIFORM' | 'PATTERN' | 'RANDOM_PICK'>('RANDOM_PICK');
        const [selectedIds, setSelectedIds] = useState<string[]>([]);

        // Lógica para "Seleccionar Todo"
        const areAllSelected = templates.length > 0 && selectedIds.length === templates.length;

        const toggleSelectAll = () => {
            if (areAllSelected) {
                setSelectedIds([]);
            } else {
                setSelectedIds(templates.map(t => t.id));
            }
        };

        if (!showGenerator) return null;

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
                    onClick={() => setShowGenerator(false)}
                />

                {/* Modal Card */}
                <div className="relative bg-white w-full max-w-lg rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-modal-scale border border-white/50">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h2 className="text-xl font-normal text-[#001d35] flex items-center gap-2">
                            <Sparkles className="text-indigo-500 fill-indigo-100" size={20} />
                            Generar <span className="font-semibold">Horarios</span>
                        </h2>
                        <button
                            onClick={() => setShowGenerator(false)}
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
                                <div className="flex justify-between items-end mb-3 px-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {mode === 'UNIFORM' ? 'Selecciona 1 turno' : 'Selecciona los turnos a usar'}
                                    </p>

                                    {/* BOTÓN SELECCIONAR TODO (Solo visible en modo Random) */}
                                    {mode === 'RANDOM_PICK' && (
                                        <button
                                            onClick={toggleSelectAll}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1.5"
                                        >
                                            {areAllSelected ? (
                                                <><CheckSquare size={14} /> Deseleccionar</>
                                            ) : (
                                                <><Square size={14} /> Seleccionar todo</>
                                            )}
                                        </button>
                                    )}
                                </div>
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
                                                        <div className="bg-[#001d35] text-white rounded-full p-0.5">
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
                            onClick={() => setShowGenerator(false)}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => handleGenerateSchedule(mode, selectedIds)}
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
    };

    // --- MODAL DE PLANTILLAS ---
    const PatternModal = () => {
        const [patterns, setPatterns] = useState<any[]>([]);
        const [loadingPat, setLoadingPat] = useState(true);

        useEffect(() => {
            patternService.getAll()
                .then((data) => { setPatterns(data); setLoadingPat(false); })
                .catch(() => setLoadingPat(false));
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
                onConfirm: async () => {
                    try {
                        await patternService.delete(id);
                        setPatterns(patterns.filter(p => p.id !== id));
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        toast.success('Plantilla eliminada');
                    } catch (e) {
                        toast.error('Error eliminando plantilla');
                    }
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
                                        onClick={() => setShowGenerator(true)}
                                        title="Generador Mágico"
                                        className="flex items-center gap-2 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dffc] hover:shadow-md px-4 py-2 rounded-xl font-medium transition-all"
                                    >
                                        <Sparkles size={18} />
                                        <span className="hidden sm:inline">Generar</span>
                                    </button>

                                    {/* BOTÓN LIMPIAR (Pánico) */}
                                    <button
                                        onClick={handleClearSchedule}
                                        disabled={!days.some(d => Object.keys(d.staffShifts).length > 0)}
                                        className="
                                            group flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border
                                            bg-white border-rose-200 text-rose-600 
                                            hover:bg-rose-50 hover:border-rose-300 hover:shadow-sm
                                            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400
                                        "
                                        title="Borrar todas las asignaciones visibles"
                                    >
                                        <Eraser size={18} className="group-hover:animate-pulse" />
                                        <span className="hidden sm:inline">Limpiar</span>
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

                        <div className="w-px h-6 bg-slate-200"></div>

                        {/* Vista 15/30 días */}
                        <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 flex">
                            <button
                                onClick={() => changeViewMode(15)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${daysToShow === 15 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                15 Días
                            </button>
                            <button
                                onClick={() => changeViewMode(30)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${daysToShow === 30 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                30 Días
                            </button>
                        </div>

                        {/* Indicador de cambios sin guardar */}
                        {hasUnsavedChanges && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                                • Sin guardar
                            </span>
                        )}
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
                            const c = SHIFT_COLORS[t.color] || SHIFT_COLORS.blue;
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
                                            // Mostrar empleados que pertenecen a esta área (cualquiera de sus area_ids)
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
                                                            <DraggableStaff key={`${staff.id}-${area.id}`} staff={staff} areas={areas} contextAreaId={area.id} />
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
                    <div ref={gridContainerRef} className="flex-1 overflow-auto bg-white">
                        <div className="flex h-full min-w-max divide-x divide-slate-100">
                            {days.map((day, idx) => {
                                const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <div
                                        key={day.date}
                                        data-date={day.date}
                                        className={`flex-1 min-w-[180px] h-full group ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                                    >
                                        <DroppableColumn
                                            day={day}
                                            dayIdx={idx}
                                            staffList={filteredStaff}
                                            templates={templates}
                                            areas={areas}
                                            viewMode={viewMode}
                                            selectedAreaId={selectedAreaId}
                                            onShiftClick={onShiftClick}
                                            onRemoveShift={(i, sId) => {
                                                const newDays = [...days];
                                                delete newDays[i].staffShifts[sId];
                                                setDays(newDays);
                                            }}
                                            onDayAction={handleDayAction}
                                        />
                                    </div>
                                );
                            })}
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

                {/* GENERATOR MODAL */}
                <GeneratorModal />

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