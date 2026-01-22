import { useDraggable } from '@dnd-kit/core';
import { Clock, AlertCircle, Coffee } from 'lucide-react';
import type { Staff, Area, ShiftTemplate } from '../../types';
import { SHIFT_COLORS, getAreaColor } from '../../constants/colors';
import type { ShiftAssignment } from '../../utils/schedulerUtils';

interface DraggableAssignedShiftProps {
    staff: Staff;
    template: ShiftTemplate;
    staffArea: Area | null;
    dayIdx: number;
    viewMode: 'edit' | 'preview';
    shiftData?: ShiftAssignment;
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
}

// Función helper para convertir hora 24h a formato 12h AM/PM
function formatTo12Hour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    // Si los minutos son 00, solo mostrar la hora
    if (minutes === 0) {
        return `${hour12}${period}`;
    }
    return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Función helper para obtener el rango de descanso entre rangos
function getBreakTimeRange(ranges: { start: string; end: string }[]): string | null {
    if (ranges.length < 2) return null;

    const breakStart = ranges[0].end;
    const breakEnd = ranges[1].start;

    // Verificar que hay un descanso válido
    const endFirst = breakStart.split(':').map(Number);
    const startSecond = breakEnd.split(':').map(Number);
    const endMinutes = endFirst[0] * 60 + endFirst[1];
    const startMinutes = startSecond[0] * 60 + startSecond[1];

    if (startMinutes <= endMinutes) return null;

    return `${formatTo12Hour(breakStart)} a ${formatTo12Hour(breakEnd)}`;
}

// --- COMPONENTE DRAGGABLE (TURNO ASIGNADO) - Google Material Card Style ---
export function DraggableAssignedShift({
    staff, template, staffArea, dayIdx, viewMode, shiftData, onShiftClick, onRemoveShift
}: DraggableAssignedShiftProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `assigned-${dayIdx}-${staff.id}`,
        data: { type: 'assigned-shift', staffId: staff.id, templateId: template.id, sourceDayIdx: dayIdx, staff },
        disabled: viewMode !== 'edit'
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;

    // Usamos el color del template para los acentos
    const templateColor = SHIFT_COLORS[template?.color] || SHIFT_COLORS.blue;
    // Usamos el color de área para detalles sutiles
    const areaColor = getAreaColor(staffArea?.color);

    // Datos de incidencia
    const hasNote = !!shiftData?.note;
    const isSubstitution = !!shiftData?.is_substitution;

    // Calcular duración de descanso si hay jornada partida
    const breakDuration = template?.schedule_config ? getBreakTimeRange(template.schedule_config) : null;

    const startTime = template.schedule_config?.[0]?.start;
    const endTime = template.schedule_config?.[template.schedule_config.length - 1]?.end;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            role="button"
            tabIndex={viewMode === 'edit' ? 0 : -1}
            aria-label={`Turno de ${staff.full_name}, ${template?.name || 'turno'}, ${startTime} a ${endTime}`}
            aria-roledescription="turno arrastrable"
            onClick={() => viewMode === 'edit' && onShiftClick(dayIdx, staff.id)}
            onKeyDown={(e) => {
                if (viewMode !== 'edit') return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onShiftClick(dayIdx, staff.id);
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    onRemoveShift(dayIdx, staff.id);
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                if (viewMode === 'edit') onRemoveShift(dayIdx, staff.id);
            }}
            className={`
                group relative w-full mb-3 
                bg-white 
                rounded-2xl
                border border-slate-100
                shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]
                hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:border-slate-200 hover:-translate-y-0.5
                transition-all duration-300 cubic-bezier(0.2, 0, 0, 1)
                cursor-pointer select-none overflow-hidden
                ${isSubstitution ? 'border-l-4 border-l-amber-400 border-dashed' : ''}
                ${isDragging ? 'opacity-50 scale-95 ring-4 ring-blue-100 rotate-2 z-50' : ''}
            `}
        >
            {/* Indicador de Nota/Incidencia */}
            {hasNote && (
                <div className="absolute -top-1.5 -right-1.5 z-10">
                    <div className="bg-amber-400 text-amber-900 rounded-full p-0.5 shadow-sm border-2 border-white">
                        <AlertCircle size={10} />
                    </div>
                    {/* Tooltip con la nota */}
                    <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-800 text-white p-2 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="font-bold text-amber-300 mb-0.5">Nota:</p>
                        <p className="text-slate-200">{shiftData?.note}</p>
                    </div>
                </div>
            )}

            <div className="p-3">
                {/* Header: Chip de Turno y Hora */}
                <div className="flex justify-between items-start mb-2">
                    {/* Chip del Turno (Píldora) */}
                    <div className={`
                        px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase
                        ${templateColor.bg} ${templateColor.text}
                        flex items-center gap-1.5 border border-white/50
                    `}>
                        <div className={`w-1.5 h-1.5 rounded-full ${templateColor.accent}`}></div>
                        {template.code}
                    </div>

                    {/* Hora Minimalista */}
                    {startTime && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            <Clock size={10} className="text-slate-300" />
                            <span>{formatTo12Hour(startTime)}-{endTime ? formatTo12Hour(endTime) : ''}</span>
                        </div>
                    )}
                </div>

                {/* Body: Información del Staff */}
                <div className="flex items-center gap-2.5">
                    {/* Avatar/Inicial con color del área */}
                    <div className={`
                        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                        text-xs font-bold text-white shadow-sm
                        ${areaColor.dot}
                    `}>
                        {staff.full_name.substring(0, 1)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-700 truncate leading-tight">
                            {staff.full_name}
                        </h4>
                        <p className={`text-[10px] truncate mt-0.5 font-medium ${areaColor.text} opacity-80`}>
                            {staffArea?.name || 'Sin área'}
                        </p>
                    </div>
                </div>

                {/* Footer: Descanso y Sustitución */}
                {(breakDuration || isSubstitution) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                        {/* Indicador de descanso */}
                        {breakDuration && (
                            <span className="flex items-center gap-1 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                <Coffee size={9} />
                                <span>Descanso: {breakDuration}</span>
                            </span>
                        )}

                        {/* Indicador de sustitución */}
                        {isSubstitution && (
                            <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                Suplencia
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Decoración Hover: Barra lateral que aparece al pasar el mouse */}
            <div className={`
                absolute left-0 top-3 bottom-3 w-1 rounded-r-full
                ${templateColor.accent} 
                opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-0
                transition-all duration-300
            `}></div>
        </div>
    );
}
