import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import type { Staff, Area } from '../../types';
import { getAreaColor } from '../../constants/colors';

interface DraggableStaffProps {
    staff: Staff;
    areas: Area[];
    shiftCount?: number;
    contextAreaId?: string;
}

// --- COMPONENTE DRAGGABLE (EMPLEADO) - Sidebar Style ---
export const DraggableStaff = memo(function DraggableStaff({ staff, areas, shiftCount, contextAreaId }: DraggableStaffProps) {
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
});
