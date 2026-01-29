import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { DragEndEvent } from '@dnd-kit/core';
import { patternService, availabilityService } from '../Services';
import type { DaySchedule, ShiftAssignment } from '../utils/schedulerUtils';
import { getShiftData } from '../utils/schedulerUtils';
import type { Staff, Area, ShiftTemplate } from '../types';

interface UseScheduleActionsProps {
    days: DaySchedule[];
    setDays: (days: DaySchedule[]) => void;
    templates: ShiftTemplate[];
    staffList: Staff[];
    areas: Area[];
    selectedAreaId: string;
    activeTemplateId: string | null;
    pushToHistory: () => void; // <-- For undo/redo
    clearHistory: () => void;  // <-- Clear history after save
}

export function useScheduleActions({
    days, setDays, templates, staffList, areas, selectedAreaId, activeTemplateId, pushToHistory, clearHistory
}: UseScheduleActionsProps) {
    const [saving, setSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Auto-save debounce ref
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dirty days tracking - only save modified days
    const dirtyDaysRef = useRef<Set<string>>(new Set());

    // Refs for stable access in callbacks
    const daysRef = useRef(days);
    const templatesRef = useRef(templates);
    const staffListRef = useRef(staffList);
    const areasRef = useRef(areas);
    const selectedAreaIdRef = useRef(selectedAreaId);
    const activeTemplateIdRef = useRef(activeTemplateId);

    // Sync refs
    useEffect(() => { daysRef.current = days; }, [days]);
    useEffect(() => { templatesRef.current = templates; }, [templates]);
    useEffect(() => { staffListRef.current = staffList; }, [staffList]);
    useEffect(() => { areasRef.current = areas; }, [areas]);
    useEffect(() => { selectedAreaIdRef.current = selectedAreaId; }, [selectedAreaId]);
    useEffect(() => { activeTemplateIdRef.current = activeTemplateId; }, [activeTemplateId]);

    // Helper to mark a day as dirty
    const markDayDirty = useCallback((date: string) => {
        dirtyDaysRef.current.add(date);
    }, []);

    // --- AUTO-SAVE WITH DEBOUNCE (2 seconds after last change) ---
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        // Clear any existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(async () => {
            setIsAutoSaving(true);
            try {
                const currentDays = daysRef.current;
                const dirtyDates = Array.from(dirtyDaysRef.current);

                // Only save dirty days (optimization + race condition safety)
                const payload = currentDays
                    .filter(d => dirtyDates.includes(d.date))
                    .map(d => ({
                        date: d.date,
                        status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE',
                        staff_shifts: d.staffShifts
                    }));

                if (payload.length > 0) {
                    // FIX BUG 1: Usar upsertSchedule (reemplazo completo) en lugar de merge
                    // Esto asegura que los turnos borrados se eliminen correctamente
                    await availabilityService.upsertSchedule(payload);
                }

                dirtyDaysRef.current.clear();
                setHasUnsavedChanges(false);
                clearHistory(); // Clear undo/redo history after successful auto-save
                toast.success(`Guardado automático (${payload.length} días) ✓`, {
                    duration: 1500,
                    icon: '💾',
                    style: { fontSize: '12px', padding: '8px 12px' }
                });
            } catch (error) {
                console.error('Auto-save error:', error);
                toast.error('Error en guardado automático', { duration: 2000 });
            } finally {
                setIsAutoSaving(false);
            }
        }, 2000); // 2 seconds debounce

        // Cleanup timeout on unmount or when hasUnsavedChanges changes
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [days, hasUnsavedChanges]); // Add 'days' to reset timer on each change

    // --- CONFLICT DETECTION: Deshabilitado ---
    // FIX BUG 2: Como solo se permite 1 turno por día/persona, esta validación
    // es redundante y bloquea la edición de turnos existentes.
    // Si necesitas validar descansos entre días, implementa esa lógica aquí.
    const checkTimeConflict = useCallback((_staffId: string, _targetDayIdx: number, _newTemplateId: string): boolean => {
        // Deshabilitado: retorna false siempre para permitir edición
        return false;
    }, []);

    // --- DRAG & DROP LOGIC ---
    const handleDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        if (!over) return;

        const targetData = over.data.current as { dayIdx: number, day: DaySchedule };
        if (!targetData?.day) return;

        const { dayIdx: targetDayIdx, day: targetDay } = targetData;
        if (targetDay.status !== 'OPEN') return toast.error('Día cerrado');

        const currentDays = [...daysRef.current];

        // CASO 1: RE-AGENDAR (Drag desde el calendario)
        if (active.data.current?.type === 'assigned-shift') {
            const { staffId, sourceDayIdx, staff: draggedStaff } = active.data.current;
            if (sourceDayIdx === targetDayIdx) return;

            const existingShift = currentDays[sourceDayIdx].staffShifts[staffId];

            // Create new objects to ensure immutability
            const newDays = [...currentDays];
            newDays[sourceDayIdx] = { ...newDays[sourceDayIdx], staffShifts: { ...newDays[sourceDayIdx].staffShifts } };
            delete newDays[sourceDayIdx].staffShifts[staffId];

            // FIX BUG 4: Verificar si el empleado ya tiene turno en el día destino
            if (newDays[targetDayIdx].staffShifts[staffId]) {
                toast.error(`Error: ${draggedStaff?.full_name || 'Empleado'} ya tiene turno el día ${targetDay.dayNumber}`);
                return;
            }

            newDays[targetDayIdx].staffShifts[staffId] = existingShift;

            pushToHistory(); // 📸 Snapshot before change
            setDays(newDays);
            markDayDirty(newDays[sourceDayIdx].date); // Mark source day as dirty
            markDayDirty(targetDay.date); // Mark target day as dirty
            setHasUnsavedChanges(true); // Re-scheduling counts as change
            toast.success(`Turno de ${draggedStaff?.full_name || 'empleado'} movido al día ${targetDay.dayNumber}`);
            return;
        }

        // CASO 2: ASIGNAR NUEVO (Drag desde sidebar)
        if (!active.data.current?.staff) return;
        const staff = active.data.current.staff as Staff;

        if (templatesRef.current.length === 0) return toast.error('Crea plantillas primero');

        const templateToUse = activeTemplateIdRef.current || templatesRef.current[0].id;

        // IMPORTANTE: Guardar el turno con el área actualmente seleccionada
        const areaToSave = selectedAreaIdRef.current !== 'ALL' ? selectedAreaIdRef.current : (staff.area_ids?.[0] || null);

        // Check for time conflict before assigning
        if (checkTimeConflict(staff.id, targetDayIdx, templateToUse)) {
            toast.error(`⚠️ ${staff.full_name} ya tiene un turno que se superpone en este horario`, {
                duration: 4000,
                icon: '⏰'
            });
            return; // Prevent assignment
        }

        const newDays = [...currentDays];
        newDays[targetDayIdx] = {
            ...newDays[targetDayIdx],
            staffShifts: { ...newDays[targetDayIdx].staffShifts }
        };
        newDays[targetDayIdx].staffShifts[staff.id] = {
            templateId: templateToUse,
            areaId: areaToSave
        };
        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);
        markDayDirty(targetDay.date); // Mark day as dirty
        setHasUnsavedChanges(true);

        const templateUsed = templatesRef.current.find(t => t.id === templateToUse);
        toast.success(`${staff.full_name} asignado al día ${targetDay.dayNumber} (${templateUsed?.name || 'turno'})`);
    }, [setDays, checkTimeConflict, pushToHistory, markDayDirty]);

    // --- CLICK ACTIONS ---
    const onShiftClick = useCallback((i: number, sId: string) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        const currentShift = getShiftData(newDays[i].staffShifts[sId]);
        const staff = staffListRef.current.find(s => s.id === sId);

        if (activeTemplateIdRef.current) {
            if (currentShift.templateId !== activeTemplateIdRef.current) {
                newDays[i] = { ...newDays[i], staffShifts: { ...newDays[i].staffShifts } };
                newDays[i].staffShifts[sId] = {
                    templateId: activeTemplateIdRef.current,
                    areaId: currentShift.areaId
                };
                pushToHistory(); // 📸 Snapshot before change
                setDays(newDays);
                markDayDirty(newDays[i].date); // Mark day as dirty
                setHasUnsavedChanges(true);
                const newTemplate = templatesRef.current.find(t => t.id === activeTemplateIdRef.current);
                toast.success(`Turno cambiado a ${newTemplate?.name || 'nuevo turno'}`);
            }
        } else {
            if (templatesRef.current.length === 0) return;
            const currentIdx = templatesRef.current.findIndex(t => t.id === currentShift.templateId);
            const nextIdx = (currentIdx + 1) % templatesRef.current.length;

            newDays[i] = { ...newDays[i], staffShifts: { ...newDays[i].staffShifts } };
            newDays[i].staffShifts[sId] = {
                templateId: templatesRef.current[nextIdx].id,
                areaId: currentShift.areaId
            };
            pushToHistory(); // 📸 Snapshot before change
            setDays(newDays);
            markDayDirty(newDays[i].date); // Mark day as dirty
            setHasUnsavedChanges(true);
            toast.success(`${staff?.full_name || 'Empleado'} → ${templatesRef.current[nextIdx].name}`);
        }
    }, [setDays, pushToHistory, markDayDirty]);

    const handleDayAction = useCallback((action: string, idx: number) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        if (action === 'toggle') {
            if (newDays[idx].status === 'OPEN') {
                newDays[idx] = { ...newDays[idx], status: 'CLOSED' };
            } else {
                newDays[idx] = { ...newDays[idx], status: 'OPEN' };
            }
            pushToHistory(); // 📸 Snapshot before change
            setDays(newDays);
            markDayDirty(newDays[idx].date); // Mark day as dirty
            setHasUnsavedChanges(true);
        }
        if (action === 'copy_prev' && idx > 0) {
            newDays[idx] = { ...newDays[idx], staffShifts: { ...newDays[idx - 1].staffShifts } };
            pushToHistory(); // 📸 Snapshot before change
            setDays(newDays);
            markDayDirty(newDays[idx].date); // Mark day as dirty
            setHasUnsavedChanges(true);
            toast.success('Copiado del día anterior');
        }
    }, [setDays, pushToHistory, markDayDirty]);

    const clearDay = useCallback((idx: number) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        newDays[idx] = { ...newDays[idx], staffShifts: {} };
        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);
        markDayDirty(newDays[idx].date); // Mark day as dirty
        setHasUnsavedChanges(true);
        toast.success('Turnos eliminados');
    }, [setDays, pushToHistory, markDayDirty]);

    // --- SAVING ---
    const handleSave = useCallback(async () => {
        const dirtyDates = Array.from(dirtyDaysRef.current);

        // If nothing to save (auto-save already handled it)
        if (dirtyDates.length === 0) {
            toast.success('Ya está todo guardado ✓', { duration: 1500 });
            setHasUnsavedChanges(false);
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Guardando cambios...');
        try {
            const currentDays = daysRef.current;

            // Only save dirty days (optimization + race condition safety)
            const payload = currentDays
                .filter(d => dirtyDates.includes(d.date))
                .map(d => ({
                    date: d.date,
                    status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE',
                    staff_shifts: d.staffShifts
                }));

            // FIX BUG 1: Usar upsertSchedule (reemplazo completo) en lugar de merge
            await availabilityService.upsertSchedule(payload);

            const totalShifts = payload.reduce((acc, d) => acc + Object.keys(d.staff_shifts).length, 0);
            toast.success(`¡Guardado! ${totalShifts} turnos en ${payload.length} días`, { id: toastId });
            dirtyDaysRef.current.clear();
            setHasUnsavedChanges(false);
            clearHistory(); // Clear undo/redo history after successful save
        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Error al guardar los cambios', { id: toastId });
        } finally {
            setSaving(false);
        }
    }, [clearHistory]);

    // saveAsPattern ahora recibe el nombre como parámetro
    // El componente que llama debe manejar el modal/input para obtener el nombre
    const saveAsPattern = useCallback(async (patternName: string) => {
        if (!patternName?.trim()) {
            toast.error('El nombre de la plantilla es requerido');
            return;
        }
        setSaving(true);

        const currentDays = daysRef.current;
        const shiftsToSave = currentDays.map(d => {
            if (selectedAreaIdRef.current === 'ALL') return d.staffShifts;
            const filteredShifts: Record<string, string | ShiftAssignment> = {};
            Object.entries(d.staffShifts).forEach(([staffId, shiftValue]) => {
                const shiftData = getShiftData(shiftValue);
                const staff = staffListRef.current.find(s => s.id === staffId);
                if (shiftData.areaId === selectedAreaIdRef.current ||
                    (!shiftData.areaId && staff?.area_ids?.includes(selectedAreaIdRef.current))) {
                    filteredShifts[staffId] = shiftValue;
                }
            });
            return filteredShifts;
        });

        try {
            await patternService.create({
                name: patternName.trim(),
                area: selectedAreaIdRef.current === 'ALL' ? 'General' : areasRef.current.find(a => a.id === selectedAreaIdRef.current)?.name || 'General',
                shift_data: shiftsToSave
            });
            toast.success('Plantilla guardada');
        } catch (e) {
            toast.error('Error guardando plantilla');
        }
        setSaving(false);
    }, []);

    // --- GENERATOR ---
    const handleGenerateSchedule = useCallback((
        mode: 'UNIFORM' | 'PATTERN' | 'RANDOM_PICK',
        selectedIds: string[]
    ) => {
        const currentDays = daysRef.current;
        const filteredStaff = selectedAreaIdRef.current === 'ALL' ?
            staffListRef.current :
            staffListRef.current.filter(s => s.area_ids && s.area_ids.includes(selectedAreaIdRef.current));

        const newDays = currentDays.map((day, dayIndex) => {
            if (day.status !== 'OPEN') return day;
            const newShifts = { ...day.staffShifts };

            filteredStaff.forEach((staff, staffIndex) => {
                if (newShifts[staff.id]) return;

                let templateId = '';
                if (mode === 'UNIFORM') {
                    templateId = selectedIds[0];
                } else if (mode === 'RANDOM_PICK') {
                    templateId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
                } else if (mode === 'PATTERN') {
                    const idx = (dayIndex + staffIndex) % templatesRef.current.length;
                    templateId = templatesRef.current[idx].id;
                }

                if (templateId) {
                    const areaToSave = selectedAreaIdRef.current !== 'ALL' ? selectedAreaIdRef.current : (staff.area_ids?.[0] || null);
                    newShifts[staff.id] = { templateId, areaId: areaToSave };
                }
            });
            return { ...day, staffShifts: newShifts };
        });

        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);
        // Mark all modified days as dirty
        newDays.forEach(day => {
            if (day.status === 'OPEN') markDayDirty(day.date);
        });
        setHasUnsavedChanges(true); // Generation is a change
        toast.success('¡Horario generado mágicamente! ✨');
    }, [setDays, pushToHistory, markDayDirty]);

    const clearAllSchedule = useCallback(async () => {
        const currentDays = daysRef.current;
        const newDays = currentDays.map(day => {
            if (day.status !== 'OPEN') return day;
            return { ...day, staffShifts: {} };
        });

        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);

        // Días abiertos a limpiar
        const clearedDays = newDays.filter(day => day.status === 'OPEN');

        // FIX BUG 3: Usar upsertSchedule con staff_shifts vacío en lugar de DELETE
        // Esto preserva el status del día (OPEN/CLOSED)
        const toastId = toast.loading('Limpiando horario...');
        try {
            const payload = clearedDays.map(d => ({
                date: d.date,
                status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE',
                staff_shifts: {} // Vacía los turnos pero mantiene el registro
            }));

            await availabilityService.upsertSchedule(payload);

            dirtyDaysRef.current.clear();
            setHasUnsavedChanges(false);
            clearHistory();
            toast.success(`¡Horario limpiado! ${clearedDays.length} días borrados`, { id: toastId });
        } catch (error) {
            console.error('Error limpiando horario:', error);
            toast.error('Error al limpiar el horario', { id: toastId });
            setHasUnsavedChanges(true);
        }
    }, [setDays, pushToHistory, clearHistory]);

    const removeShift = useCallback((dayIdx: number, staffId: string) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        newDays[dayIdx] = { ...newDays[dayIdx], staffShifts: { ...newDays[dayIdx].staffShifts } };
        delete newDays[dayIdx].staffShifts[staffId];
        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);
        markDayDirty(newDays[dayIdx].date); // Mark day as dirty
        setHasUnsavedChanges(true);
    }, [setDays, pushToHistory, markDayDirty]);

    const applyPattern = useCallback((pattern: any) => {
        const currentDays = daysRef.current;
        const newDays = currentDays.map((d, i) =>
            i < pattern.shift_data.length ? { ...d, staffShifts: { ...d.staffShifts, ...pattern.shift_data[i] } } : d
        );
        pushToHistory(); // 📸 Snapshot before change
        setDays(newDays);
        // Mark pattern-affected days as dirty
        newDays.slice(0, pattern.shift_data.length).forEach(day => markDayDirty(day.date));
        setHasUnsavedChanges(true);
        toast.success(`Plantilla "${pattern.name}" aplicada`);
    }, [setDays, pushToHistory, markDayDirty]);

    // --- BULK ACTION: Asignar turno a múltiples celdas ---
    const handleBulkAction = useCallback((cellIds: string[], templateId: string) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        let changesCount = 0;

        // Set para saber qué días ya fueron clonados profundamente
        const daysToClone = new Set<number>();

        cellIds.forEach(cellId => {
            // El staffId puede contener guiones (UUID), separar solo por el primer guión
            const firstDashIdx = cellId.indexOf('-');
            const dayIdxStr = cellId.substring(0, firstDashIdx);
            const staffId = cellId.substring(firstDashIdx + 1);
            const dayIdx = parseInt(dayIdxStr);

            if (newDays[dayIdx].status !== 'OPEN') return; // No editar días cerrados

            // Clonar staffShifts del día si aún no se ha hecho
            if (!daysToClone.has(dayIdx)) {
                newDays[dayIdx] = {
                    ...newDays[dayIdx],
                    staffShifts: { ...newDays[dayIdx].staffShifts }
                };
                daysToClone.add(dayIdx);
            }

            // Obtener área correcta
            const staff = staffListRef.current.find(s => s.id === staffId);
            const areaToSave = selectedAreaIdRef.current !== 'ALL'
                ? selectedAreaIdRef.current
                : (staff?.area_ids?.[0] || null);

            // Asignar turno
            newDays[dayIdx].staffShifts[staffId] = {
                templateId,
                areaId: areaToSave
            };

            markDayDirty(newDays[dayIdx].date);
            changesCount++;
        });

        if (changesCount > 0) {
            pushToHistory();
            setDays(newDays);
            setHasUnsavedChanges(true);
            toast.success(`Turno asignado a ${changesCount} celdas`);
        }
    }, [setDays, pushToHistory, markDayDirty]);

    // --- BULK DELETE: Eliminar turnos de múltiples celdas ---
    const handleBulkDelete = useCallback((cellIds: string[]) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        let changesCount = 0;
        const processedDays = new Set<number>();

        cellIds.forEach(cellId => {
            const firstDashIdx = cellId.indexOf('-');
            const dayIdxStr = cellId.substring(0, firstDashIdx);
            const staffId = cellId.substring(firstDashIdx + 1);
            const dayIdx = parseInt(dayIdxStr);

            if (isNaN(dayIdx) || dayIdx < 0 || dayIdx >= newDays.length) return;

            // Clonar día para inmutabilidad
            if (!processedDays.has(dayIdx)) {
                newDays[dayIdx] = { ...newDays[dayIdx], staffShifts: { ...newDays[dayIdx].staffShifts } };
                processedDays.add(dayIdx);
                markDayDirty(newDays[dayIdx].date);
            }

            if (newDays[dayIdx].staffShifts[staffId]) {
                delete newDays[dayIdx].staffShifts[staffId];
                changesCount++;
            }
        });

        if (changesCount > 0) {
            pushToHistory();
            setDays(newDays);
            setHasUnsavedChanges(true);
            toast.success(`${changesCount} turnos eliminados`, { icon: '🗑️' });
        }
    }, [setDays, pushToHistory, markDayDirty]);

    return {
        saving,
        isAutoSaving,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        handleDragEnd,
        onShiftClick,
        handleDayAction,
        clearDay,
        clearAllSchedule,
        removeShift,
        applyPattern,
        handleSave,
        saveAsPattern,
        handleGenerateSchedule,
        handleBulkAction,
        handleBulkDelete
    };
}
