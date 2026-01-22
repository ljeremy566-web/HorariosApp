import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, getDaysInMonth, setDate } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { staffService, areaService, templateService, availabilityService } from '../Services';
import type { Staff, Area, ShiftTemplate } from '../types';
import type { DaySchedule } from '../utils/schedulerUtils';

export function useSchedulerData() {
    const [loading, setLoading] = useState(true);

    // 1. ESTADO DE FECHA: Inicializamos en la quincena actual
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        // Si hoy es <= 15, iniciamos el día 1. Si no, el 16.
        return today.getDate() <= 15 ? setDate(today, 1) : setDate(today, 16);
    });

    // 2. MODO DE VISTA: 15 (Quincena) o 30 (Mes completo)
    const [viewSpan, setViewSpan] = useState<15 | 30>(15);
    const [sundaysBlocked, setSundaysBlocked] = useState(true);

    // Datos
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [days, setDays] = useState<DaySchedule[]>([]);

    const gridContainerRef = useRef<HTMLDivElement>(null);

    // 3. CÁLCULO DINÁMICO DE DÍAS A MOSTRAR
    const daysToShow = useMemo(() => {
        if (viewSpan === 30) return 30; // Si forzamos 30 días, devolvemos 30

        const currentDay = currentDate.getDate();
        if (currentDay === 1) {
            return 15; // Primera quincena (1-15)
        } else {
            // Segunda quincena (16 - Fin de mes)
            const daysInMonth = getDaysInMonth(currentDate);
            return daysInMonth - 15; // Ej: 31 - 15 = 16 días
        }
    }, [currentDate, viewSpan]);

    useEffect(() => {
        loadData();
    }, [currentDate, daysToShow, sundaysBlocked]);

    // Scroll automático al día HOY
    useEffect(() => {
        if (!loading && days.length > 0 && gridContainerRef.current) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            // Buscamos el elemento que tenga la fecha de hoy
            const todayElement = gridContainerRef.current.querySelector(`[data-date="${todayStr}"]`);
            if (todayElement) {
                setTimeout(() => {
                    todayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }, 300);
            }
        }
    }, [loading, days.length]); // Se ejecuta cuando cargan los días

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

            // Calcular rango de fechas para la API
            const startStr = format(currentDate, 'yyyy-MM-dd');
            const endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() + daysToShow - 1);
            const endStr = format(endDate, 'yyyy-MM-dd');

            const schedule = await availabilityService.getByDateRange(startStr, endStr);
            generateGrid(schedule, currentDate, daysToShow);
        } catch (e) {
            console.error(e);
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

    const toggleSundays = () => setSundaysBlocked(prev => !prev);

    // 4. NAVEGACIÓN INTELIGENTE ENTRE QUINCENAS
    const navigateDate = useCallback((direction: 'prev' | 'next') => {
        setCurrentDate(prevDate => {
            const currentDay = prevDate.getDate();
            const currentMonth = prevDate.getMonth();
            const currentYear = prevDate.getFullYear();

            if (direction === 'next') {
                if (currentDay === 1) {
                    // Estamos en 1ra Quincena -> Ir a 2da (día 16)
                    return new Date(currentYear, currentMonth, 16);
                } else {
                    // Estamos en 2da Quincena -> Ir a 1ra del SIGUIENTE mes
                    return new Date(currentYear, currentMonth + 1, 1);
                }
            } else {
                if (currentDay > 1) {
                    // Estamos en 2da Quincena -> Volver a 1ra (día 1)
                    return new Date(currentYear, currentMonth, 1);
                } else {
                    // Estamos en 1ra Quincena -> Volver a 2da del mes ANTERIOR
                    return new Date(currentYear, currentMonth - 1, 16);
                }
            }
        });
    }, []);

    return {
        loading,
        days,
        setDays,
        staffList,
        areas,
        templates,
        currentDate,
        daysToShow,   // Ahora es calculado
        viewSpan,     // Nuevo estado para controlar el switch 15/30
        setViewSpan,  // Setter para el switch
        sundaysBlocked,
        toggleSundays,
        navigateDate,
        gridContainerRef,
        loadData
    };
}
