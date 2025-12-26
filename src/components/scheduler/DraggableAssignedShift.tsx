import { useDraggable } from '@dnd-kit/core';
import { Clock } from 'lucide-react';
import type { Staff, Area, ShiftTemplate } from '../../types';
import { SHIFT_COLORS, getAreaColor } from '../../constants/colors';

interface DraggableAssignedShiftProps {
    staff: Staff;
    template: ShiftTemplate;
    staffArea: Area | null;
    dayIdx: number;
    viewMode: 'edit' | 'preview';
    onShiftClick: (idx: number, sId: string) => void;
    onRemoveShift: (idx: number, sId: string) => void;
}

// --- COMPONENTE DRAGGABLE (TURNO ASIGNADO) - Calendar Style ---
export function DraggableAssignedShift({
    staff, template, staffArea, dayIdx, viewMode, onShiftClick, onRemoveShift
}: DraggableAssignedShiftProps) {
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
