import { useState } from 'react';
import { Sparkles, X, Shuffle, AlignJustify, Repeat, CalendarDays, CheckSquare, Square, Check, Wand2 } from 'lucide-react';
import type { ShiftTemplate } from '../../types';

interface GeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ShiftTemplate[];
    onGenerate: (mode: 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK', selectedIds: string[]) => void;
}

// --- GENERATOR MODAL (Google Material You Style) ---
export function GeneratorModal({ isOpen, onClose, templates, onGenerate }: GeneratorModalProps) {
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

    if (!isOpen) return null;

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
                onClick={onClose}
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
                        onClick={onClose}
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
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onGenerate(mode, selectedIds)}
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
}
