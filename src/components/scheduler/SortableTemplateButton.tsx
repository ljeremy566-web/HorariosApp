import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical } from 'lucide-react';
import { SHIFT_COLORS } from '../../constants/colors';
import type { ShiftTemplate } from '../../types';

interface SortableTemplateButtonProps {
    template: ShiftTemplate;
    index: number;
    isActive: boolean;
    onToggle: (id: string) => void;
}

export const SortableTemplateButton = memo(function SortableTemplateButton({
    template,
    index,
    isActive,
    onToggle
}: SortableTemplateButtonProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: template.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    const c = SHIFT_COLORS[template.color] || SHIFT_COLORS.blue;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center gap-1 rounded-full text-xs font-medium transition-all flex-shrink-0 cursor-default
                ${isActive
                    ? `${c.bg} ${c.text} ring-2 ring-offset-1 ${c.accent.replace('bg-', 'ring-')} scale-105`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
                ${isDragging ? 'shadow-lg' : ''}
            `}
        >
            {/* Handle para arrastrar */}
            <button
                {...attributes}
                {...listeners}
                className={`
                    p-1.5 cursor-grab active:cursor-grabbing rounded-l-full
                    ${isActive ? 'hover:bg-black/10' : 'hover:bg-slate-300'}
                    transition-colors
                `}
                title="Arrastra para reordenar"
            >
                <GripVertical size={12} className="opacity-50" />
            </button>

            {/* Botón principal */}
            <button
                onClick={() => onToggle(template.id)}
                className="flex items-center gap-2 pr-3 py-1.5"
                title={`${isActive ? 'Clic para deseleccionar' : 'Clic para seleccionar'}${index < 9 ? ` (Atajo: ${index + 1})` : ''}`}
            >
                {/* Badge con número de atajo */}
                {index < 9 && (
                    <span className={`
                        text-[9px] font-bold px-1.5 py-0.5 rounded border
                        ${isActive
                            ? 'bg-white/50 text-current border-transparent'
                            : 'bg-slate-200 text-slate-500 border-slate-300'}
                    `}>
                        {index + 1}
                    </span>
                )}
                <span className={`w-2.5 h-2.5 rounded-full ${c.accent}`}></span>
                {template.name}
                {isActive && <Check size={12} strokeWidth={3} />}
            </button>
        </div>
    );
});
