import { useNavigate } from 'react-router-dom';
import { X, Users, Clock, MapPin, ChevronRight } from 'lucide-react';

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    route: string;
}

const quickActions: QuickAction[] = [
    {
        id: 'staff',
        title: 'Nuevo Personal',
        description: 'Agregar un nuevo miembro al equipo',
        icon: <Users size={22} />,
        color: 'blue',
        route: '/app/staff'
    },
    {
        id: 'template',
        title: 'Nueva Plantilla',
        description: 'Crear un nuevo turno o plantilla de horario',
        icon: <Clock size={22} />,
        color: 'green',
        route: '/app/templates'
    },
    {
        id: 'area',
        title: 'Nueva Área',
        description: 'Definir una nueva área de trabajo',
        icon: <MapPin size={22} />,
        color: 'orange',
        route: '/app/areas'
    }
];

// Google style colors
const colorStyles: Record<string, { icon: string; bg: string; hover: string }> = {
    blue: {
        icon: 'text-[#1a73e8]',
        bg: 'bg-[#e8f0fe]',
        hover: 'hover:bg-[#d2e3fc]'
    },
    green: {
        icon: 'text-[#1e8e3e]',
        bg: 'bg-[#e6f4ea]',
        hover: 'hover:bg-[#ceead6]'
    },
    orange: {
        icon: 'text-[#e37400]',
        bg: 'bg-[#fef7e0]',
        hover: 'hover:bg-[#feefc3]'
    }
};

export function CreateModal({ isOpen, onClose }: CreateModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleActionClick = (action: QuickAction) => {
        onClose();
        // Navigate with state to auto-open the create form
        navigate(action.route, { state: { openCreateForm: true } });
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-fade"
            onClick={handleBackdropClick}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.32)' }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-modal-scale">
                {/* Header - Google Style */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex justify-between items-start">
                        <h2 className="text-[22px] font-normal text-[#202124]">
                            Crear nuevo
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 -mt-1 hover:bg-[#f1f3f4] rounded-full text-[#5f6368] transition-colors duration-200"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-[14px] text-[#5f6368] mt-1">
                        Selecciona qué deseas crear
                    </p>
                </div>

                {/* Actions List - Google Style */}
                <div className="px-3 pb-4">
                    {quickActions.map((action, index) => {
                        const style = colorStyles[action.color];
                        return (
                            <button
                                key={action.id}
                                onClick={() => handleActionClick(action)}
                                className={`
                                    w-full flex items-center gap-4 px-4 py-3 rounded-xl
                                    transition-all duration-200 group text-left
                                    hover:bg-[#f1f3f4] active:bg-[#e8eaed]
                                `}
                                style={{
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                {/* Icon Container */}
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center
                                    transition-transform duration-200 group-hover:scale-105
                                    ${style.bg} ${style.icon}
                                `}>
                                    {action.icon}
                                </div>

                                {/* Text Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[14px] font-medium text-[#202124] leading-tight">
                                        {action.title}
                                    </h3>
                                    <p className="text-[12px] text-[#5f6368] mt-0.5 truncate">
                                        {action.description}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <ChevronRight
                                    size={20}
                                    className="text-[#dadce0] group-hover:text-[#5f6368] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Footer - Keyboard hint */}
                <div className="px-6 py-3 bg-[#f8f9fa] border-t border-[#e8eaed]">
                    <p className="text-[11px] text-[#80868b] text-center flex items-center justify-center gap-2">
                        Presiona
                        <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#dadce0] font-mono text-[10px] shadow-sm">
                            ESC
                        </kbd>
                        para cerrar
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CreateModal;
