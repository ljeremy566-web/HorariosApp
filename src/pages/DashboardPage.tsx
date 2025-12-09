import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../database/supabase';
import {
    Users, Clock, Calendar, AlertTriangle, ArrowRight,
    Activity, Loader2, Layers, User, RefreshCw,
    ChevronRight, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Staff, ShiftTemplate, TimeRange } from '../types';

interface TodayShift {
    person: Staff;
    template: ShiftTemplate;
    isActiveNow: boolean;
}

interface DayPreview {
    date: string;
    dayName: string;
    dayNumber: string;
    shiftsCount: number;
    isToday: boolean;
    isPast: boolean;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
}

interface Alert {
    type: 'warning' | 'info' | 'danger';
    title: string;
    description: string;
    action?: { label: string; path: string };
}

// Colores consistentes
const COLORS: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-[#c2e7ff]', text: 'text-[#001d35]' },
    orange: { bg: 'bg-[#ffdbcd]', text: 'text-[#5a1e00]' },
    purple: { bg: 'bg-[#e5deff]', text: 'text-[#1d0063]' },
    green: { bg: 'bg-[#c4eed0]', text: 'text-[#003912]' },
    red: { bg: 'bg-[#ffcdd2]', text: 'text-[#410002]' },
    cyan: { bg: 'bg-[#b8f6ff]', text: 'text-[#00363d]' },
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Data states
    const [stats, setStats] = useState({
        activeNow: 0,
        scheduledToday: 0,
        totalStaff: 0,
        totalTemplates: 0,
        weekTotalShifts: 0,
        avgShiftsPerDay: 0
    });

    const [todayShifts, setTodayShifts] = useState<TodayShift[]>([]);
    const [weekPreview, setWeekPreview] = useState<DayPreview[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

    const loadDashboardData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');

            // Obtener rango de la semana actual + próxima
            const weekStart = format(today, 'yyyy-MM-dd');
            const weekEnd = format(addDays(today, 13), 'yyyy-MM-dd');

            // Cargar todos los datos en paralelo
            const [staffRes, templatesRes, scheduleRes] = await Promise.all([
                supabase.from('staff').select('*').eq('is_active', true),
                supabase.from('shift_templates').select('*'),
                supabase.from('availability_schedule')
                    .select('*')
                    .gte('date', weekStart)
                    .lte('date', weekEnd)
            ]);

            const staff = staffRes.data || [];
            const tmpls = templatesRes.data || [];
            const scheduleData = scheduleRes.data || [];

            setStaffList(staff);
            setTemplates(tmpls);

            // --- PROCESAR TURNOS DE HOY ---
            const todaySchedule = scheduleData.find(s => s.date === todayStr);
            let activeNow = 0;
            let scheduledToday = 0;
            const currentShifts: TodayShift[] = [];
            const assignedTodayIds: string[] = [];

            if (todaySchedule?.staff_shifts) {
                const shifts = todaySchedule.staff_shifts as Record<string, string>;
                scheduledToday = Object.keys(shifts).length;

                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                Object.entries(shifts).forEach(([staffId, templateId]) => {
                    const person = staff.find(s => s.id === staffId);
                    const tmpl = tmpls.find(t => t.id === templateId);

                    if (person && tmpl) {
                        assignedTodayIds.push(staffId);

                        let isActiveNow = false;
                        const ranges = tmpl.schedule_config || [];

                        ranges.forEach((r: TimeRange) => {
                            const [startH, startM] = r.start.split(':').map(Number);
                            const [endH, endM] = r.end.split(':').map(Number);
                            const startMin = startH * 60 + startM;
                            const endMin = endH * 60 + endM;

                            if (currentTime >= startMin && currentTime <= endMin) {
                                isActiveNow = true;
                            }
                        });

                        if (isActiveNow) activeNow++;

                        currentShifts.push({ person, template: tmpl, isActiveNow });
                    }
                });
            }

            setTodayShifts(currentShifts);

            // --- GENERAR VISTA PREVIA DE LA SEMANA ---
            const weekDays: DayPreview[] = [];
            let totalWeekShifts = 0;
            let daysWithShifts = 0;

            for (let i = 0; i < 7; i++) {
                const d = addDays(today, i);
                const dateStr = format(d, 'yyyy-MM-dd');
                const daySchedule = scheduleData.find(s => s.date === dateStr);
                const shiftsCount = daySchedule?.staff_shifts
                    ? Object.keys(daySchedule.staff_shifts).length
                    : 0;

                if (shiftsCount > 0) daysWithShifts++;
                totalWeekShifts += shiftsCount;

                weekDays.push({
                    date: dateStr,
                    dayName: format(d, 'EEE', { locale: es }),
                    dayNumber: format(d, 'd'),
                    shiftsCount,
                    isToday: isSameDay(d, today),
                    isPast: false,
                    status: daySchedule?.status || (d.getDay() === 0 ? 'DISABLED_BY_RULE' : 'OPEN')
                });
            }

            setWeekPreview(weekDays);

            // --- GENERAR ALERTAS DINÁMICAS ---
            const newAlerts: Alert[] = [];

            // Alerta: días vacíos en la semana
            const emptyDays = weekDays.filter(d => d.shiftsCount === 0 && d.status === 'OPEN');
            if (emptyDays.length > 0) {
                newAlerts.push({
                    type: 'danger',
                    title: `${emptyDays.length} día${emptyDays.length > 1 ? 's' : ''} sin turnos`,
                    description: `Los días ${emptyDays.map(d => d.dayName).join(', ')} no tienen personal asignado.`,
                    action: { label: 'Asignar turnos', path: '/app/scheduler' }
                });
            }

            // Alerta: personal sin asignar hoy
            const unassignedToday = staff.filter(s => !assignedTodayIds.includes(s.id));
            if (unassignedToday.length > 0 && today.getDay() !== 0) {
                newAlerts.push({
                    type: 'warning',
                    title: `${unassignedToday.length} empleado${unassignedToday.length > 1 ? 's' : ''} sin turno hoy`,
                    description: unassignedToday.slice(0, 3).map(s => s.full_name).join(', ') +
                        (unassignedToday.length > 3 ? ` y ${unassignedToday.length - 3} más...` : ''),
                    action: { label: 'Ver planificador', path: '/app/scheduler' }
                });
            }

            // Alerta: sin plantillas
            if (tmpls.length === 0) {
                newAlerts.push({
                    type: 'info',
                    title: 'Sin plantillas de turno',
                    description: 'Crea plantillas para poder asignar turnos al personal.',
                    action: { label: 'Crear plantillas', path: '/app/templates' }
                });
            }

            // Alerta: sin personal
            if (staff.length === 0) {
                newAlerts.push({
                    type: 'info',
                    title: 'Sin personal registrado',
                    description: 'Añade empleados para empezar a gestionar horarios.',
                    action: { label: 'Añadir personal', path: '/app/staff' }
                });
            }

            setAlerts(newAlerts);

            // --- ACTUALIZAR ESTADÍSTICAS ---
            setStats({
                activeNow,
                scheduledToday,
                totalStaff: staff.length,
                totalTemplates: tmpls.length,
                weekTotalShifts: totalWeekShifts,
                avgShiftsPerDay: daysWithShifts > 0 ? Math.round(totalWeekShifts / daysWithShifts) : 0
            });

            setLastUpdate(new Date());

        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();

        // Auto-refresh cada 2 minutos
        const interval = setInterval(() => loadDashboardData(true), 120000);
        return () => clearInterval(interval);
    }, [loadDashboardData]);

    const handleRefresh = () => {
        loadDashboardData(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                        Actualizado: {format(lastUpdate, 'HH:mm')}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        En línea
                    </div>
                </div>
            </div>

            {/* Alertas Dinámicas */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${alert.type === 'danger'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : alert.type === 'warning'
                                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                                    : 'bg-blue-50 border-blue-200 text-blue-800'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {alert.type === 'danger' ? (
                                    <AlertCircle size={20} />
                                ) : alert.type === 'warning' ? (
                                    <AlertTriangle size={20} />
                                ) : (
                                    <Activity size={20} />
                                )}
                                <div>
                                    <p className="font-semibold text-sm">{alert.title}</p>
                                    <p className="text-xs opacity-80">{alert.description}</p>
                                </div>
                            </div>
                            {alert.action && (
                                <button
                                    onClick={() => navigate(alert.action!.path)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${alert.type === 'danger'
                                        ? 'bg-red-200 hover:bg-red-300'
                                        : alert.type === 'warning'
                                            ? 'bg-orange-200 hover:bg-orange-300'
                                            : 'bg-blue-200 hover:bg-blue-300'
                                        }`}
                                >
                                    {alert.action.label}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* KPIs Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <Activity size={20} />
                        </div>
                        {stats.activeNow > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                ACTIVO
                            </span>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mt-3">{stats.activeNow}</p>
                    <p className="text-xs text-slate-400 mt-1">En turno ahora</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg w-fit">
                        <Users size={20} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mt-3">
                        {stats.scheduledToday}
                        <span className="text-sm text-slate-400 font-normal">/{stats.totalStaff}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Turnos programados hoy</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg w-fit">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mt-3">{stats.weekTotalShifts}</p>
                    <p className="text-xs text-slate-400 mt-1">Turnos esta semana</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg w-fit">
                        <Layers size={20} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mt-3">{stats.avgShiftsPerDay}</p>
                    <p className="text-xs text-slate-400 mt-1">Promedio/día</p>
                </div>
            </div>

            {/* Vista Previa de la Semana */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-500" />
                        Próximos 7 días
                    </h2>
                    <button
                        onClick={() => navigate('/app/scheduler')}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                        Ver completo <ChevronRight size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-7 divide-x divide-slate-100">
                    {weekPreview.map((day) => (
                        <div
                            key={day.date}
                            onClick={() => navigate('/app/scheduler')}
                            className={`p-3 text-center cursor-pointer transition-colors hover:bg-slate-50 ${day.isToday ? 'bg-blue-50' : ''
                                } ${day.status !== 'OPEN' ? 'opacity-50' : ''}`}
                        >
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {day.dayName}
                            </p>
                            <p className={`text-lg font-semibold mt-1 ${day.isToday
                                ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                                : 'text-slate-700'
                                }`}>
                                {day.dayNumber}
                            </p>
                            <div className="mt-2">
                                {day.status !== 'OPEN' ? (
                                    <span className="text-[10px] text-slate-400 font-medium">Cerrado</span>
                                ) : day.shiftsCount > 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                        <div className="flex -space-x-1">
                                            {[...Array(Math.min(day.shiftsCount, 3))].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white"
                                                />
                                            ))}
                                        </div>
                                        {day.shiftsCount > 3 && (
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                +{day.shiftsCount - 3}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-orange-500 font-medium">Sin turnos</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Panel: Turnos de Hoy */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-blue-500" size={18} /> Turnos de Hoy
                        </h2>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                            {todayShifts.length} turnos
                        </span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {todayShifts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay turnos programados para hoy</p>
                                <button
                                    onClick={() => navigate('/app/scheduler')}
                                    className="mt-3 text-sm text-blue-600 hover:underline"
                                >
                                    Ir al planificador →
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {todayShifts.map((shift, idx) => {
                                    const theme = COLORS[shift.template.color] || COLORS.blue;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                                    {shift.person.full_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700 text-sm">{shift.person.full_name}</p>
                                                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${theme.bg} ${theme.text}`}>
                                                        <span className="font-semibold">{shift.template.code}</span>
                                                        <span className="opacity-70">
                                                            {shift.template.schedule_config.map(r => `${r.start}-${r.end}`).join(' / ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {shift.isActiveNow ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold">
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                                    </span>
                                                    EN TURNO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-full">
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Lateral: Accesos Rápidos */}
                <div className="space-y-4">
                    {/* Acceso Rápido Principal */}
                    <div
                        onClick={() => navigate('/app/scheduler')}
                        className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-xl shadow-lg shadow-blue-200/50 text-white cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <h3 className="font-bold text-lg">Planificador</h3>
                        <p className="text-blue-100 text-sm mt-1">Gestionar turnos semanales</p>
                        <ArrowRight size={20} className="mt-3 opacity-70" />
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-sm mb-3">Resumen Rápido</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 flex items-center gap-2">
                                    <User size={14} /> Personal activo
                                </span>
                                <span className="text-sm font-bold text-slate-700">{stats.totalStaff}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 flex items-center gap-2">
                                    <Layers size={14} /> Plantillas
                                </span>
                                <span className="text-sm font-bold text-slate-700">{stats.totalTemplates}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 flex items-center gap-2">
                                    <CheckCircle2 size={14} /> Cobertura hoy
                                </span>
                                <span className="text-sm font-bold text-slate-700">
                                    {stats.totalStaff > 0
                                        ? Math.round((stats.scheduledToday / stats.totalStaff) * 100)
                                        : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Accesos Rápidos */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-sm mb-3">Accesos</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => navigate('/app/staff')}
                                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                            >
                                <span className="text-slate-600 text-sm flex items-center gap-2">
                                    <Users size={16} className="text-slate-400" /> Personal
                                </span>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                            </button>
                            <button
                                onClick={() => navigate('/app/templates')}
                                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition-colors group"
                            >
                                <span className="text-slate-600 text-sm flex items-center gap-2">
                                    <Layers size={16} className="text-slate-400" /> Plantillas
                                </span>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
