import { useState, useMemo, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    Lock, Unlock, Save, Loader2,
    User, ChevronLeft, ChevronRight,
    BookmarkPlus, DownloadCloud, Eraser, Palette, Sparkles, Clock, Check
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { AREA_COLORS, SHIFT_COLORS, getAreaColor } from '../constants/colors';
import type { Area } from '../types';

// Components
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DraggableStaff } from '../components/scheduler/DraggableStaff';
import { DroppableColumn } from '../components/scheduler/DroppableColumn';
import { PatternModal } from '../components/scheduler/PatternModal';
import { GeneratorModal } from '../components/scheduler/GeneratorModal';


// Hooks
import { useSchedulerData } from '../hooks/useSchedulerData';
import { useScheduleActions } from '../hooks/useScheduleActions';

// --- MAIN PAGE ---
export default function SchedulerPage() {
    // State managed by hooks
    const {
        loading,
        days,
        setDays,
        staffList,
        areas,
        templates,
        currentDate,
        daysToShow,
        setDaysToShow,
        sundaysBlocked,
        toggleSundays,
        navigateDate,
        gridContainerRef
    } = useSchedulerData();

    // Local UI State
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
    const [showPatternModal, setShowPatternModal] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [activeDragData, setActiveDragData] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'default' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Actions hook
    const {
        saving,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        handleDragEnd: onDragEndAction,
        onShiftClick,
        handleDayAction: onDayActionLogic,
        clearDay,
        clearAllSchedule,
        removeShift,
        applyPattern,
        handleSave,
        saveAsPattern,
        handleGenerateSchedule
    } = useScheduleActions({
        days, setDays, templates, staffList, areas, selectedAreaId, activeTemplateId
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const filteredStaff = useMemo(() =>
        selectedAreaId === 'ALL' ? staffList : staffList.filter(s => s.area_ids && s.area_ids.includes(selectedAreaId)),
        [selectedAreaId, staffList]);

    // Calculate staff shift counts (logic preserved from original)
    const staffShiftCounts = useMemo(() => days.reduce((acc, day) => {
        Object.keys(day.staffShifts).forEach(staffId => {
            acc[staffId] = (acc[staffId] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>), [days]);

    // Wrappers for actions requiring confirmation or specific UI handling within the page
    // Wrappers for actions requiring confirmation or specific UI handling within the page
    const handleDragStart = useCallback((e: any) => {
        setActiveDragData(e.active.data.current);
    }, []);

    const handleDragEnd = useCallback((e: any) => {
        setActiveDragData(null);
        onDragEndAction(e);
    }, [onDragEndAction]);

    const handleDayAction = useCallback((action: 'copy_prev' | 'clear' | 'toggle', idx: number) => {
        if (action === 'clear') {
            setConfirmDialog({
                isOpen: true,
                title: 'Limpiar turnos',
                message: '¿Eliminar todos los turnos de este día?',
                variant: 'danger',
                onConfirm: () => {
                    clearDay(idx);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            onDayActionLogic(action, idx);
        }
    }, [clearDay, onDayActionLogic]);

    const onClearScheduleClick = useCallback(() => {
        const hasShifts = days.some(day => Object.keys(day.staffShifts).length > 0);
        if (!hasShifts) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Limpiar horario completo',
            message: '¿Estás seguro de que quieres LIMPIAR todas las asignaciones visibles? Esta acción no se puede deshacer.',
            variant: 'danger',
            onConfirm: () => {
                clearAllSchedule();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    }, [days, clearAllSchedule]);

    const changeViewMode = useCallback((mode: 15 | 30) => {
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
    }, [daysToShow, hasUnsavedChanges, setDaysToShow, setHasUnsavedChanges]);

    const toggleTemplateSelection = useCallback((templateId: string) => {
        setActiveTemplateId(prev => prev === templateId ? null : templateId);
    }, []);

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
                                <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <ChevronLeft size={20} className="text-slate-700" />
                                </button>
                                <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <ChevronRight size={20} className="text-slate-700" />
                                </button>
                            </div>

                            {/* Título */}
                            <div>
                                <h1 className="text-xl font-normal text-slate-800">
                                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {format(currentDate, 'dd')} - {format(addDays(currentDate, daysToShow - 1), 'dd MMM')}
                                </p>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                            {viewMode === 'edit' && (
                                <>
                                    <button onClick={() => setShowPatternModal(true)} title="Cargar plantilla" className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <DownloadCloud size={20} />
                                    </button>
                                    <button onClick={saveAsPattern} title="Guardar como plantilla" className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <BookmarkPlus size={20} />
                                    </button>
                                    <button onClick={() => setShowGenerator(true)} title="Generador Mágico" className="flex items-center gap-2 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dffc] hover:shadow-md px-4 py-2 rounded-xl font-medium transition-all">
                                        <Sparkles size={18} />
                                        <span className="hidden sm:inline">Generar</span>
                                    </button>

                                    {/* BOTÓN LIMPIAR (Pánico) */}
                                    <button
                                        onClick={onClearScheduleClick}
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

                    {/* Sidebar - Personal */}
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
                                    // MODO AGRUPADO
                                    <div className="py-2">
                                        {areas.map(area => {
                                            const areaStaff = staffList.filter(s => s.area_ids?.includes(area.id));
                                            if (areaStaff.length === 0) return null;
                                            const color = getAreaColor(area.color);

                                            return (
                                                <div key={area.id} className="mb-1">
                                                    <div className={`sticky top-0 z-10 px-3 py-2 flex items-center justify-between ${color.bg} backdrop-blur-sm`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                                                            <span className={`text-xs font-semibold ${color.text}`}>{area.name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-medium ${color.text} opacity-70`}>{areaStaff.length}</span>
                                                    </div>
                                                    <div className="py-1">
                                                        {areaStaff.map(staff => (
                                                            <DraggableStaff key={`${staff.id}-${area.id}`} staff={staff} areas={areas} contextAreaId={area.id} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Sin área */}
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
                                    // MODO LISTA
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
                                            onRemoveShift={removeShift}
                                            onDayAction={handleDayAction}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <PatternModal
                    isOpen={showPatternModal}
                    onClose={() => setShowPatternModal(false)}
                    onApply={(p) => {
                        applyPattern(p);
                        setShowPatternModal(false);
                    }}
                />

                <GeneratorModal
                    isOpen={showGenerator}
                    onClose={() => setShowGenerator(false)}
                    templates={templates}
                    onGenerate={(mode, ids) => {
                        handleGenerateSchedule(mode, ids);
                        setShowGenerator(false);
                    }}
                />

                <DragOverlay dropAnimation={null}>
                    {activeDragData ? (() => {
                        const staff = activeDragData.staff;
                        if (!staff) return null;

                        const area = staff.area_ids?.[0] ? areas.find((a: Area) => a.id === staff.area_ids![0]) : null;
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