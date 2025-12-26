import { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lock, Unlock, Copy, Trash2 } from 'lucide-react';
import { isSameDay } from 'date-fns';
import type { Staff, Area, ShiftTemplate } from '../../types';
import type { DaySchedule } from '../../utils/schedulerUtils';
import { getShiftData } from '../../utils/schedulerUtils';
import { DraggableAssignedShift } from './DraggableAssignedShift';

interface DroppableColumnProps {
    day: DaySchedule;
    dayIdx: number;
    staffList: Staff[];
    templates: ShiftTemplate[];
    areas: Area[];
    viewMode: 'edit' | 'preview';
    selectedAreaId: string; // 'ALL' o el ID del área filtrada
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
    onDayAction: (action: 'copy_prev' | 'clear' | 'toggle', idx: number) => void;
}

// --- COMPONENTE DROPPABLE (COLUMNA DE DÍA) - Google Calendar Style ---
export const DroppableColumn = memo(function DroppableColumn({ day, dayIdx, staffList, templates, areas, viewMode, selectedAreaId, onShiftClick, onRemoveShift, onDayAction }: DroppableColumnProps) {
    const { isOver, setNodeRef } = useDroppable({ id: `day-${day.date}`, data: { dayIdx, day } });

    const visibleAssignments = useMemo(() => {
        return Object.entries(day.staffShifts).map(([staffId, shiftValue]) => {
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
    }, [day.staffShifts, staffList, templates, areas, selectedAreaId]);

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
});
