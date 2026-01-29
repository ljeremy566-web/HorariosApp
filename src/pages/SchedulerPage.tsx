import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import {
    Lock, Unlock, Save, Loader2,
    User, ChevronLeft, ChevronRight,
    BookmarkPlus, DownloadCloud, Eraser, Palette, Sparkles, Clock,
    Undo2, Redo2, Share2, X, CheckCheck
} from 'lucide-react';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import toast from 'react-hot-toast';

import { AREA_COLORS, getAreaColor } from '../constants/colors';
import type { Area } from '../types';
import { templateService } from '../Services';

// Components
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Modal } from '../components/Modal';
import { DraggableStaff } from '../components/scheduler/DraggableStaff';
import { DroppableColumn } from '../components/scheduler/DroppableColumn';
import { PatternModal } from '../components/scheduler/PatternModal';
import { GeneratorModal } from '../components/scheduler/GeneratorModal';
import { SortableTemplateButton } from '../components/scheduler/SortableTemplateButton';

// Hooks
import { useSchedulerData } from '../hooks/useSchedulerData';
import { useScheduleActions } from '../hooks/useScheduleActions';
import { useHistorySync } from '../hooks/useHistory';

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
        viewSpan,
        setViewSpan,
        sundaysBlocked,
        toggleSundays,
        navigateDate,
        gridContainerRef
    } = useSchedulerData();

    // Undo/Redo history for days state
    const { undo, redo, canUndo, canRedo, clearHistory, pushToHistory } = useHistorySync(days, setDays);

    // Local UI State
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
    const [showPatternModal, setShowPatternModal] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [activeDragData, setActiveDragData] = useState<{
        type?: string;
        staff?: import('../types').Staff;
        templateId?: string;
        areaId?: string | null;
    } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'default' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Estado para el modal de guardar como plantilla (reemplaza prompt())
    const [showSavePatternModal, setShowSavePatternModal] = useState(false);
    const [patternNameInput, setPatternNameInput] = useState('');

    // Estado para selección múltiple (bulk selection)
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

    // Estado para orden personalizado de templates (para atajos 1-9)
    const [templateOrder, setTemplateOrder] = useState<string[]>([]);

    // Sincronizar orden de templates cuando cambian
    useEffect(() => {
        if (templates.length === 0) return;
        // El backend devuelve templates ordenados por position, así que confiamos en ese orden
        setTemplateOrder(templates.map(t => t.id));
    }, [templates]);

    // Templates en orden personalizado
    const orderedTemplates = useMemo(() => {
        if (templateOrder.length === 0) return templates;

        const templateMap = new Map(templates.map(t => [t.id, t]));
        const ordered = templateOrder
            .map(id => templateMap.get(id))
            .filter((t): t is typeof templates[0] => !!t);

        // Fallback para templates nuevos
        if (ordered.length < templates.length) {
            const addedIds = new Set(ordered.map(t => t.id));
            const missing = templates.filter(t => !addedIds.has(t.id));
            return [...ordered, ...missing];
        }
        return ordered;
    }, [templates, templateOrder]);

    // Handler para reordenar templates
    const handleTemplateReorder = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            let newOrder: string[] = [];
            setTemplateOrder(prev => {
                const oldIndex = prev.indexOf(String(active.id));
                const newIndex = prev.indexOf(String(over.id));
                newOrder = arrayMove(prev, oldIndex, newIndex);
                return newOrder;
            });

            // Persistir cambios
            try {
                const updates = newOrder.map((id, index) => ({ id, position: index }));
                await templateService.reorder(updates);
            } catch (error) {
                console.error('Error saving order', error);
                toast.error('No se pudo guardar el orden');
            }
        }
    }, []);

    // Actions hook
    const {
        saving,
        isAutoSaving,
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
        handleGenerateSchedule,
        handleBulkAction,
        handleBulkDelete
    } = useScheduleActions({
        days, setDays, templates, staffList, areas, selectedAreaId, activeTemplateId, pushToHistory, clearHistory
    });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const templateSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const filteredStaff = useMemo(() =>
        selectedAreaId === 'ALL' ? staffList : staffList.filter(s => s.area_ids && s.area_ids.includes(selectedAreaId)),
        [selectedAreaId, staffList]);

    // Wrappers for actions requiring confirmation or specific UI handling within the page
    // Wrappers for actions requiring confirmation or specific UI handling within the page
    const handleDragStart = useCallback((e: DragStartEvent) => {
        setActiveDragData(e.active.data.current as typeof activeDragData);
    }, []);

    const handleDragEnd = useCallback((e: DragEndEvent) => {
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
            title: '⚠️ BORRAR TODO EL HORARIO',
            message: '🚨 ATENCIÓN: Esta acción ELIMINARÁ PERMANENTEMENTE todos los turnos asignados de la quincena actual. Los datos se borrarán de la base de datos y NO se pueden recuperar. ¿Estás completamente seguro?',
            variant: 'danger',
            onConfirm: () => {
                clearAllSchedule();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    }, [days, clearAllSchedule]);

    const changeViewSpan = useCallback((mode: 15 | 30) => {
        if (mode === viewSpan) return;
        if (hasUnsavedChanges) {
            setConfirmDialog({
                isOpen: true,
                title: 'Cambios sin guardar',
                message: 'Tienes cambios pendientes. Si cambias de vista ahora, perderás tu trabajo actual. ¿Deseas continuar?',
                variant: 'danger',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setHasUnsavedChanges(false);
                    setViewSpan(mode);
                }
            });
        } else {
            setViewSpan(mode);
        }
    }, [viewSpan, hasUnsavedChanges, setViewSpan, setHasUnsavedChanges]);

    // LÓGICA DE TÍTULO DE PERIODO
    const periodLabel = useMemo(() => {
        if (viewSpan === 30) return `${format(currentDate, 'dd MMM')} - 30 días`;

        const day = currentDate.getDate();
        const monthName = format(currentDate, 'MMMM', { locale: es });
        const daysInMonthTotal = getDaysInMonth(currentDate);

        if (day === 1) return `1ª Quincena (01 - 15 ${monthName})`;
        return `2ª Quincena (16 - ${daysInMonthTotal} ${monthName})`;
    }, [currentDate, viewSpan]);

    const toggleTemplateSelection = useCallback((templateId: string) => {
        setActiveTemplateId(prev => prev === templateId ? null : templateId);
    }, []);

    // Handler para Shift+Click en celdas (selección múltiple)
    const handleCellClick = useCallback((dayIdx: number, staffId: string, _currentShift: unknown, e: React.MouseEvent) => {
        e.stopPropagation(); // Evitar propagación del evento

        const cellId = `${dayIdx}-${staffId}`;

        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            // Modo selección: toggle la celda en el set
            setSelectedCells(prev => {
                const newSet = new Set(prev);
                if (newSet.has(cellId)) {
                    newSet.delete(cellId);
                } else {
                    newSet.add(cellId);
                }
                return newSet;
            });
            return; // 🛑 RETURN: No ejecutar cambio de turno
        }

        // Si no hay tecla especial, limpiar selección y ejecutar acción normal
        if (selectedCells.size > 0) {
            setSelectedCells(new Set());
        }
        onShiftClick(dayIdx, staffId);
    }, [selectedCells, onShiftClick]);

    // Aplicar turno masivo a celdas seleccionadas
    const handleBulkAssign = useCallback(() => {
        if (!activeTemplateId) {
            toast.error('Selecciona un turno (pincel) primero');
            return;
        }

        handleBulkAction(Array.from(selectedCells), activeTemplateId);
        setSelectedCells(new Set()); // Limpiar selección
    }, [activeTemplateId, selectedCells, handleBulkAction]);

    // 🎹 MODO PIANO: Atajos de teclado para asignación rápida
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar si el usuario está escribiendo en un input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            if (viewMode !== 'edit') return;

            // ESC: Cancelar selección o soltar pincel
            if (e.key === 'Escape') {
                if (selectedCells.size > 0) setSelectedCells(new Set());
                else setActiveTemplateId(null);
                return;
            }

            // SUPR/BACKSPACE: Borrar turnos seleccionados
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedCells.size > 0) {
                    handleBulkDelete(Array.from(selectedCells));
                    setSelectedCells(new Set());
                }
                return;
            }

            // NÚMEROS 1-9: Asignación Rápida (usa orderedTemplates)
            if (/^[1-9]$/.test(e.key)) {
                const index = parseInt(e.key) - 1;
                if (index < orderedTemplates.length) {
                    const template = orderedTemplates[index];

                    if (selectedCells.size > 0) {
                        // Si hay celdas seleccionadas -> ASIGNAR A TODOS
                        handleBulkAction(Array.from(selectedCells), template.id);
                        setSelectedCells(new Set());
                    } else {
                        // Si no hay selección -> CAMBIAR PINCEL
                        setActiveTemplateId(template.id);
                        toast.success(`Pincel: ${template.name}`, {
                            icon: '🎨',
                            duration: 1000,
                            position: 'bottom-center'
                        });
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedCells, orderedTemplates, handleBulkAction, handleBulkDelete]);

    // Exportar como imagen
    const handleExportImage = useCallback(async () => {
        if (!gridContainerRef.current) return;

        const loadingId = toast.loading('Generando imagen del horario...');
        try {
            const container = gridContainerRef.current;
            // Obtener el elemento hijo que contiene todo el contenido del grid
            const gridContent = container.firstElementChild as HTMLElement;

            if (!gridContent) {
                toast.error('No se encontró contenido para exportar', { id: loadingId });
                return;
            }

            // Capturar el tamaño completo del contenido (incluyendo scroll)
            const fullWidth = container.scrollWidth;
            const fullHeight = container.scrollHeight;

            const dataUrl = await toPng(gridContent, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true,
                width: fullWidth,
                height: fullHeight,
                style: {
                    // Asegurar que se renderice todo el contenido
                    transform: 'none',
                    overflow: 'visible',
                }
            });

            const areaName = selectedAreaId === 'ALL'
                ? 'General'
                : areas.find(a => a.id === selectedAreaId)?.name || 'Area';
            const dateStr = format(currentDate, 'yyyy-MM-dd');

            download(dataUrl, `Horario_${areaName}_${dateStr}.png`);
            toast.success('Imagen descargada correctamente', { id: loadingId });
        } catch (error) {
            console.error('Error exporting image:', error);
            toast.error('Error al exportar la imagen', { id: loadingId });
        }
    }, [gridContainerRef, selectedAreaId, areas, currentDate]);

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
                                <h1 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
                                    {periodLabel}
                                    <span className="text-xs font-normal text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50">
                                        {format(currentDate, 'yyyy')}
                                    </span>
                                </h1>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                            {viewMode === 'edit' && (
                                <>
                                    {/* Undo/Redo buttons */}
                                    <button
                                        onClick={undo}
                                        disabled={!canUndo}
                                        title="Deshacer (Ctrl+Z)"
                                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Undo2 size={20} />
                                    </button>
                                    <button
                                        onClick={redo}
                                        disabled={!canRedo}
                                        title="Rehacer (Ctrl+Y)"
                                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Redo2 size={20} />
                                    </button>

                                    <div className="w-px h-6 bg-slate-200"></div>

                                    <button onClick={() => setShowPatternModal(true)} title="Cargar plantilla" className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <DownloadCloud size={20} />
                                    </button>
                                    <button onClick={() => { setPatternNameInput(''); setShowSavePatternModal(true); }} title="Guardar como plantilla" className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
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

                                    {/* BOTÓN EXPORTAR IMAGEN */}
                                    <button
                                        onClick={handleExportImage}
                                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-gray-200"
                                        title={`Exportar ${selectedAreaId !== 'ALL' ? 'área' : 'horario completo'} como imagen`}
                                    >
                                        <Share2 size={18} />
                                        <span className="hidden sm:inline">Exportar</span>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`ml-2 px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${hasUnsavedChanges && !saving
                                    ? 'bg-amber-500 hover:bg-amber-600 animate-pulse ring-2 ring-amber-300'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    } disabled:opacity-50 text-white`}
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                <span className="hidden sm:inline">{hasUnsavedChanges ? '¡Guardar!' : 'Guardar'}</span>
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

                        {/* Vista Quincenal/Mensual */}
                        <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 flex">
                            <button
                                onClick={() => changeViewSpan(15)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewSpan === 15 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                Quincenal
                            </button>
                            <button
                                onClick={() => changeViewSpan(30)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewSpan === 30 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                Mensual
                            </button>
                        </div>

                        {/* Indicador de cambios sin guardar / auto-guardado */}
                        {(hasUnsavedChanges || isAutoSaving) && (
                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all ${isAutoSaving
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {isAutoSaving ? (
                                    <>
                                        <Loader2 size={10} className="animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        • Sin guardar (auto-guardado en 2s)
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                </header>

                {/* === BARRA DE TURNOS (PINCELES) - ARRASTRABLES === */}
                {viewMode === 'edit' && (
                    <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center gap-3 overflow-x-auto transition-all">
                        {/* Botón para abrir sidebar si está cerrado */}
                        {!isSidebarOpen && (
                            <>
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5"
                                    title="Mostrar personal"
                                >
                                    <User size={14} />
                                    <ChevronRight size={14} />
                                </button>
                                <div className="w-px h-4 bg-slate-200"></div>
                            </>
                        )}
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5 flex-shrink-0">
                            <Palette size={14} />
                            Turnos
                        </span>

                        <div className="w-px h-5 bg-slate-200"></div>

                        {/* DndContext para reordenar templates */}
                        <DndContext
                            sensors={templateSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleTemplateReorder}
                        >
                            <SortableContext items={templateOrder} strategy={horizontalListSortingStrategy}>
                                <div className="flex items-center gap-2">
                                    {orderedTemplates.map((t, index) => (
                                        <SortableTemplateButton
                                            key={t.id}
                                            template={t}
                                            index={index}
                                            isActive={activeTemplateId === t.id}
                                            onToggle={toggleTemplateSelection}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

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
                        <div className={`${isSidebarOpen ? 'w-64 border-r' : 'w-0 border-none'} bg-white border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden`}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-start min-w-[16rem]">
                                <div>
                                    <h2 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <User size={16} className="text-slate-400" />
                                        Personal
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {filteredStaff.length} {filteredStaff.length === 1 ? 'persona' : 'personas'}
                                        {selectedAreaId === 'ALL' && areas.length > 0 && ' • Agrupados por área'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                                    title="Ocultar panel"
                                >
                                    <ChevronLeft size={16} />
                                </button>
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
                                                            <DraggableStaff key={staff.id} staff={staff} areas={areas} />
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
                                            <DraggableStaff key={staff.id} staff={staff} areas={areas} />
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
                                            selectedCells={selectedCells}
                                            onCellClick={handleCellClick}
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

                {/* Modal para guardar como plantilla (reemplaza prompt()) */}
                <Modal
                    isOpen={showSavePatternModal}
                    onClose={() => setShowSavePatternModal(false)}
                    title="Guardar como Plantilla"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Nombre de la plantilla
                            </label>
                            <input
                                type="text"
                                value={patternNameInput}
                                onChange={(e) => setPatternNameInput(e.target.value)}
                                placeholder="Ej: Horario Semana 1"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && patternNameInput.trim()) {
                                        saveAsPattern(patternNameInput);
                                        setShowSavePatternModal(false);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowSavePatternModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    saveAsPattern(patternNameInput);
                                    setShowSavePatternModal(false);
                                }}
                                disabled={!patternNameInput.trim()}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Bulk Selection Floating Action Button */}
                {selectedCells.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold">{selectedCells.size} seleccionados</span>
                            <span className="text-[10px] text-slate-400">
                                {activeTemplateId
                                    ? `Listos para asignar: ${templates.find(t => t.id === activeTemplateId)?.name}`
                                    : 'Selecciona un turno arriba para asignar'
                                }
                            </span>
                        </div>

                        <div className="h-8 w-px bg-slate-700"></div>

                        <button
                            onClick={handleBulkAssign}
                            disabled={!activeTemplateId}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <CheckCheck size={16} />
                            Aplicar
                        </button>

                        <button
                            onClick={() => setSelectedCells(new Set())}
                            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
        </DndContext>
    );
}