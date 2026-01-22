import { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lock, Unlock, Copy, Trash2 } from 'lucide-react';
import { isSameDay, isBefore, startOfDay } from 'date-fns';
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
    selectedAreaId: string;
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
    onDayAction: (action: 'copy_prev' | 'clear' | 'toggle', idx: number) => void;
}

export const DroppableColumn = memo(function DroppableColumn({
    day, dayIdx, staffList, templates, areas, viewMode, selectedAreaId,
    onShiftClick, onRemoveShift, onDayAction
}: DroppableColumnProps) {
    const { isOver, setNodeRef } = useDroppable({ id: `day-${day.date}`, data: { dayIdx, day } });

    // Filtrado de turnos (Lógica original conservada)
    const visibleAssignments = useMemo(() => {
        return Object.entries(day.staffShifts).map(([staffId, shiftValue]) => {
            const shiftData = getShiftData(shiftValue);
            const staff = staffList.find((s: Staff) => s.id === staffId);
            const template = templates.find((t: ShiftTemplate) => t.id === shiftData.templateId);
            const staffArea = staff?.area_ids?.[0] ? areas.find(a => a.id === staff.area_ids![0]) : null;
            return { staffId, staff, template, staffArea, shiftAreaId: shiftData.areaId, shiftData };
        }).filter(a => {
            if (!a.staff || !a.template) return false;
            if (selectedAreaId === 'ALL') return true;
            if (!a.shiftAreaId) return a.staff.area_ids?.includes(selectedAreaId) ?? false;
            return a.shiftAreaId === selectedAreaId;
        });
    }, [day.staffShifts, staffList, templates, areas, selectedAreaId]);

    // LÓGICA TEMPORAL (Pasado / Presente / Futuro)
    const columnDate = startOfDay(new Date(day.date + 'T00:00:00'));
    const today = startOfDay(new Date());

    const isToday = isSameDay(columnDate, today);
    const isPast = isBefore(columnDate, today);
    const isClosed = day.status !== 'OPEN';

    // Clases dinámicas según el tiempo
    let bgClass = 'bg-white';
    if (isClosed) bgClass = 'bg-slate-50/80';
    else if (isOver) bgClass = 'bg-blue-50 ring-2 ring-blue-200 z-20';
    else if (isPast) bgClass = 'bg-slate-50/60';

    // Borde especial para HOY
    const borderClass = isToday
        ? 'ring-2 ring-blue-500 ring-inset shadow-lg z-10'
        : 'border-r border-slate-100';

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[170px] flex-1 flex flex-col h-full transition-all duration-200
                ${bgClass} ${borderClass}
            `}
        >
            {/* HEADER DEL DÍA */}
            <div className={`
                sticky top-0 z-10 p-2 text-center transition-colors border-b
                ${isToday ? 'bg-blue-50/90 border-blue-200 backdrop-blur-sm' : 'bg-white/95 border-slate-100'} 
                ${isClosed || isPast ? 'opacity-70' : ''}
            `}>
                <div className="flex justify-between items-center px-1 mb-1">
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-blue-700' : 'text-slate-400'}`}>
                        {day.dayName.substring(0, 3)}
                    </span>
                    {/* Badge de estado temporal */}
                    {isToday && <span className="text-[9px] bg-blue-500 text-white px-1 rounded font-bold">HOY</span>}
                    {isPast && !isClosed && <span className="text-[9px] text-slate-400 font-medium">Pasado</span>}
                </div>

                <div className={`
                    text-xl font-normal inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors mx-auto
                    ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}
                `}>
                    {day.dayNumber}
                </div>

                {/* BOTONES DE ACCIÓN (Hover) */}
                {viewMode === 'edit' && (
                    <div className="flex justify-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onDayAction('toggle', dayIdx)} className="p-1 hover:bg-slate-200 rounded text-slate-400">
                            {isClosed ? <Unlock size={12} /> : <Lock size={12} />}
                        </button>
                        {!isClosed && (
                            <>
                                <button onClick={() => onDayAction('copy_prev', dayIdx)} className="p-1 hover:bg-slate-200 rounded text-slate-400" title="Copiar anterior">
                                    <Copy size={12} />
                                </button>
                                <button onClick={() => onDayAction('clear', dayIdx)} className="p-1 hover:bg-rose-100 rounded text-rose-400" title="Limpiar">
                                    <Trash2 size={12} />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* BODY - LISTA DE TURNOS */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {!isClosed ? (
                    visibleAssignments.length > 0 ? (
                        visibleAssignments.map(({ staffId, staff, template, staffArea, shiftData }: any) => (
                            <DraggableAssignedShift
                                key={staffId}
                                staff={staff}
                                template={template}
                                staffArea={staffArea}
                                dayIdx={dayIdx}
                                viewMode={viewMode}
                                shiftData={shiftData}
                                onShiftClick={onShiftClick}
                                onRemoveShift={onRemoveShift}
                            />
                        ))
                    ) : (
                        // Estado Vacío Inteligente
                        viewMode === 'edit' && (
                            <div className={`
                                h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg
                                ${isPast ? 'border-slate-100' : 'border-slate-200'}
                            `}>
                                {isPast ? (
                                    <div className="text-center opacity-40">
                                        <span className="text-xl">🤷‍♂️</span>
                                        <p className="text-[10px] mt-1 font-medium">Sin registros</p>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-slate-300">Vacío</span>
                                )}
                            </div>
                        )
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-60">
                        <Lock size={16} className="mb-1" />
                        <span className="text-[9px] uppercase tracking-wider">Cerrado</span>
                    </div>
                )}
            </div>

            {/* Footer simple */}
            <div className="py-1 border-t border-slate-100 text-center bg-slate-50/30">
                <span className="text-[9px] text-slate-400 font-medium">
                    {visibleAssignments.length} asignados
                </span>
            </div>
        </div>
    );
});
