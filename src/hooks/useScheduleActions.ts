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
}

export function useScheduleActions({
    days, setDays, templates, staffList, areas, selectedAreaId, activeTemplateId
}: UseScheduleActionsProps) {
    const [saving, setSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Auto-save debounce ref
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                const payload = currentDays.map(d => ({
                    date: d.date,
                    status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE',
                    staff_shifts: d.staffShifts
                }));
                await availabilityService.upsertSchedule(payload);
                setHasUnsavedChanges(false);
                toast.success('Guardado automático ✓', {
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
    }, [hasUnsavedChanges]);

    // --- CONFLICT DETECTION: Check if staff has overlapping shifts on the same day ---
    const checkTimeConflict = useCallback((staffId: string, targetDayIdx: number, newTemplateId: string): boolean => {
        const currentDays = daysRef.current;
        const targetDay = currentDays[targetDayIdx];
        const templates = templatesRef.current;

        // Get the new shift's time range
        const newTemplate = templates.find(t => t.id === newTemplateId);
        if (!newTemplate?.schedule_config?.length) return false;

        const newStart = newTemplate.schedule_config[0].start;
        const newEnd = newTemplate.schedule_config[newTemplate.schedule_config.length - 1].end;

        // Check all existing shifts on this day for the same staff member
        // Staff with multiple areas could be assigned multiple times
        for (const [assignedStaffId, shiftValue] of Object.entries(targetDay.staffShifts)) {
            if (assignedStaffId !== staffId) continue;

            const shiftData = getShiftData(shiftValue);
            const existingTemplate = templates.find(t => t.id === shiftData.templateId);

            if (!existingTemplate?.schedule_config?.length) continue;

            const existingStart = existingTemplate.schedule_config[0].start;
            const existingEnd = existingTemplate.schedule_config[existingTemplate.schedule_config.length - 1].end;

            // Check for time overlap: (StartA < EndB) && (EndA > StartB)
            const timeToMinutes = (time: string): number => {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const newStartMins = timeToMinutes(newStart);
            const newEndMins = timeToMinutes(newEnd);
            const existingStartMins = timeToMinutes(existingStart);
            const existingEndMins = timeToMinutes(existingEnd);

            if (newStartMins < existingEndMins && newEndMins > existingStartMins) {
                return true; // Conflict detected
            }
        }

        return false; // No conflict
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

            newDays[targetDayIdx] = { ...newDays[targetDayIdx], staffShifts: { ...newDays[targetDayIdx].staffShifts } };
            newDays[targetDayIdx].staffShifts[staffId] = existingShift;

            setDays(newDays);
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
        setDays(newDays);
        setHasUnsavedChanges(true);

        const templateUsed = templatesRef.current.find(t => t.id === templateToUse);
        toast.success(`${staff.full_name} asignado al día ${targetDay.dayNumber} (${templateUsed?.name || 'turno'})`);
    }, [setDays, checkTimeConflict]);

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
                setDays(newDays);
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
            setDays(newDays);
            setHasUnsavedChanges(true);
            toast.success(`${staff?.full_name || 'Empleado'} → ${templatesRef.current[nextIdx].name}`);
        }
    }, [setDays]);

    const handleDayAction = useCallback((action: string, idx: number) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        if (action === 'toggle') {
            if (newDays[idx].status === 'OPEN') {
                newDays[idx] = { ...newDays[idx], status: 'CLOSED' };
            } else {
                newDays[idx] = { ...newDays[idx], status: 'OPEN' };
            }
            setDays(newDays);
            setHasUnsavedChanges(true);
        }
        if (action === 'copy_prev' && idx > 0) {
            newDays[idx] = { ...newDays[idx], staffShifts: { ...newDays[idx - 1].staffShifts } };
            setDays(newDays);
            setHasUnsavedChanges(true);
            toast.success('Copiado del día anterior');
        }
    }, [setDays]);

    const clearDay = useCallback((idx: number) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        newDays[idx] = { ...newDays[idx], staffShifts: {} };
        setDays(newDays);
        setHasUnsavedChanges(true);
        toast.success('Turnos eliminados');
    }, [setDays]);

    // --- SAVING ---
    const handleSave = useCallback(async () => {
        setSaving(true);
        const toastId = toast.loading('Guardando cambios...');
        try {
            const currentDays = daysRef.current;
            const payload = currentDays.map(d => ({ date: d.date, status: d.status as 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE', staff_shifts: d.staffShifts }));
            await availabilityService.upsertSchedule(payload);
            const totalShifts = currentDays.reduce((acc, d) => acc + Object.keys(d.staffShifts).length, 0);
            toast.success(`¡Guardado! ${totalShifts} turnos en ${currentDays.length} días`, { id: toastId });
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Error al guardar los cambios', { id: toastId });
        } finally {
            setSaving(false);
        }
    }, []);

    const saveAsPattern = useCallback(async () => {
        const patternName = prompt("Nombre de la plantilla:");
        if (!patternName) return;
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
                name: patternName,
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

        setDays(newDays);
        setHasUnsavedChanges(true); // Generation is a change
        toast.success('¡Horario generado mágicamente! ✨');
    }, [setDays]);

    const clearAllSchedule = useCallback(() => {
        const currentDays = daysRef.current;
        const newDays = currentDays.map(day => {
            if (day.status !== 'OPEN') return day;
            return { ...day, staffShifts: {} };
        });
        setDays(newDays);
        setHasUnsavedChanges(true);
        toast.success('Horario limpiado. Recuerda guardar si quieres hacerlo permanente.');
    }, [setDays]);

    const removeShift = useCallback((dayIdx: number, staffId: string) => {
        const currentDays = daysRef.current;
        const newDays = [...currentDays];
        newDays[dayIdx] = { ...newDays[dayIdx], staffShifts: { ...newDays[dayIdx].staffShifts } };
        delete newDays[dayIdx].staffShifts[staffId];
        setDays(newDays);
        setHasUnsavedChanges(true);
    }, [setDays]);

    const applyPattern = useCallback((pattern: any) => {
        const currentDays = daysRef.current;
        const newDays = currentDays.map((d, i) =>
            i < pattern.shift_data.length ? { ...d, staffShifts: { ...d.staffShifts, ...pattern.shift_data[i] } } : d
        );
        setDays(newDays);
        setHasUnsavedChanges(true);
        toast.success(`Plantilla "${pattern.name}" aplicada`);
    }, [setDays]);

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
        handleGenerateSchedule
    };
}
