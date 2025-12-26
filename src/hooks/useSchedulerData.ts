import { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { staffService, areaService, templateService, availabilityService } from '../Services';
import type { Staff, Area, ShiftTemplate } from '../types';
import type { DaySchedule } from '../utils/schedulerUtils';

export function useSchedulerData() {
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [daysToShow, setDaysToShow] = useState<15 | 30>(30);
    const [sundaysBlocked, setSundaysBlocked] = useState(true);

    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);

    const gridContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [currentDate, daysToShow, sundaysBlocked]);

    // Scroll automático al día actual después de cargar
    useEffect(() => {
        if (!loading && days.length > 0 && gridContainerRef.current) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const todayElement = gridContainerRef.current.querySelector(`[data-date="${today}"]`);
            if (todayElement) {
                setTimeout(() => {
                    todayElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }, 100);
            }
        }
    }, [loading, days.length]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [staffData, areasData, tmplData] = await Promise.all([
                staffService.getAll(),
                areaService.getAll(),
                templateService.getAll()
            ]);

            setStaffList(staffData);
            setAreas(areasData);
            setTemplates(tmplData);

            // Calcular rango dinámico
            const today = new Date();
            const startStr = format(today, 'yyyy-MM-dd');
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + daysToShow - 1);
            const endStr = format(endDate, 'yyyy-MM-dd');

            const schedule = await availabilityService.getByDateRange(startStr, endStr);
            generateGrid(schedule, today, daysToShow);
        } catch (e) {
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const generateGrid = (dbData: any[], startDate: Date, count: number) => {
        const newDays: DaySchedule[] = [];
        for (let i = 0; i < count; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const saved = dbData?.find((s: any) => s.date === dateStr);
            const isSunday = d.getDay() === 0;

            newDays.push({
                date: dateStr,
                dayName: format(d, 'EEEE', { locale: es }),
                dayNumber: format(d, 'dd'),
                status: (saved?.status && saved.status !== 'DISABLED_BY_RULE') ? saved.status : (isSunday && sundaysBlocked ? 'DISABLED_BY_RULE' : 'OPEN'),
                staffShifts: saved?.staff_shifts || {}
            });
        }
        setDays(newDays);
    };

    const toggleSundays = () => {
        setSundaysBlocked(prev => !prev);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    return {
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
        gridContainerRef,
        loadData // Exported in case we need to reload manually
    };
}
