import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../database/supabase';
import {
    Users, Clock, Calendar, ArrowRight,
    Loader2, Layers, ChevronRight, TrendingUp, Coffee, CheckCircle
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Staff, ShiftTemplate, TimeRange } from '../types';

interface DayPreview {
    date: string;
    dayName: string;
    dayNumber: string;
    shiftsCount: number;
    isToday: boolean;
    status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE';
}

interface StaffStatus {
    person: Staff;
    status: 'active' | 'resting' | 'finished' | 'pending';
    shiftTime?: string;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        activeNow: 0,
        scheduledToday: 0,
        totalStaff: 0,
        totalTemplates: 0,
        weekTotalShifts: 0
    });

    const [weekPreview, setWeekPreview] = useState<DayPreview[]>([]);
    const [staffStatuses, setStaffStatuses] = useState<StaffStatus[]>([]);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');
            const weekEnd = format(addDays(today, 6), 'yyyy-MM-dd');

            const [staffRes, templatesRes, scheduleRes] = await Promise.all([
                supabase.from('staff').select('*').eq('is_active', true),
                supabase.from('shift_templates').select('*'),
                supabase.from('availability_schedule')
                    .select('*')
                    .gte('date', todayStr)
                    .lte('date', weekEnd)
            ]);

            const staff = staffRes.data || [];
            const tmpls = templatesRes.data || [];
            const scheduleData = scheduleRes.data || [];

            // Procesar turnos de hoy y estados del personal
            const todaySchedule = scheduleData.find(s => s.date === todayStr);
            let activeNow = 0;
            let scheduledToday = 0;
            const statuses: StaffStatus[] = [];

            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            if (todaySchedule?.staff_shifts) {
                const shifts = todaySchedule.staff_shifts as Record<string, string | { templateId: string; areaId: string | null }>;
                scheduledToday = Object.keys(shifts).length;

                Object.entries(shifts).forEach(([staffId, shiftValue]) => {
                    const person = staff.find(s => s.id === staffId);

                    // Manejar ambos formatos: string (antiguo) y objeto (nuevo)
                    const templateId = typeof shiftValue === 'string' ? shiftValue : shiftValue.templateId;
                    const tmpl = tmpls.find(t => t.id === templateId);

                    if (person && tmpl) {
                        const ranges = tmpl.schedule_config || [];
                        let personStatus: 'active' | 'resting' | 'finished' | 'pending' = 'pending';
                        let shiftTime = '';
                        let isActive = false;
                        let hasFinished = false;

                        ranges.forEach((r: TimeRange) => {
                            const [startH, startM] = r.start.split(':').map(Number);
                            const [endH, endM] = r.end.split(':').map(Number);
                            const startMin = startH * 60 + startM;
                            const endMin = endH * 60 + endM;

                            shiftTime = `${r.start} - ${r.end}`;

                            if (currentTime >= startMin && currentTime <= endMin) {
                                isActive = true;
                            } else if (currentTime > endMin) {
                                hasFinished = true;
                            }
                        });

                        // Determinar estado final
                        if (isActive) {
                            personStatus = 'active';
                            activeNow++;
                        } else if (hasFinished) {
                            personStatus = 'finished';
                        } else {
                            personStatus = 'pending';
                        }

                        statuses.push({ person, status: personStatus, shiftTime });
                    } else if (person) {
                        // Tiene turno pero no se encontró el template
                        statuses.push({ person, status: 'pending', shiftTime: 'Sin horario' });
                    }
                });

                // Agregar personal sin turno hoy como "descanso"
                staff.forEach(person => {
                    if (!shifts[person.id]) {
                        statuses.push({ person, status: 'resting' });
                    }
                });
            } else {
                // Si no hay turnos hoy, todos están en descanso
                staff.forEach(person => {
                    statuses.push({ person, status: 'resting' });
                });
            }

            setStaffStatuses(statuses);

            // Vista previa de la semana
            const weekDays: DayPreview[] = [];
            let totalWeekShifts = 0;

            for (let i = 0; i < 7; i++) {
                const d = addDays(today, i);
                const dateStr = format(d, 'yyyy-MM-dd');
                const daySchedule = scheduleData.find(s => s.date === dateStr);
                const shiftsCount = daySchedule?.staff_shifts
                    ? Object.keys(daySchedule.staff_shifts).length
                    : 0;

                totalWeekShifts += shiftsCount;

                weekDays.push({
                    date: dateStr,
                    dayName: format(d, 'EEE', { locale: es }).toUpperCase(),
                    dayNumber: format(d, 'd'),
                    shiftsCount,
                    isToday: isSameDay(d, today),
                    status: daySchedule?.status || (d.getDay() === 0 ? 'DISABLED_BY_RULE' : 'OPEN')
                });
            }

            setWeekPreview(weekDays);
            setStats({
                activeNow,
                scheduledToday,
                totalStaff: staff.length,
                totalTemplates: tmpls.length,
                weekTotalShifts: totalWeekShifts
            });

        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
        // Auto-refresh cada minuto
        const interval = setInterval(loadDashboardData, 60000);
        return () => clearInterval(interval);
    }, [loadDashboardData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Filtrar por estado
    const activeStaff = staffStatuses.filter(s => s.status === 'active');
    const restingStaff = staffStatuses.filter(s => s.status === 'resting');
    const finishedStaff = staffStatuses.filter(s => s.status === 'finished');
    const pendingStaff = staffStatuses.filter(s => s.status === 'pending');

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header minimalista */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-800">
                    Buenos días 👋
                </h1>
                <p className="text-slate-500 mt-1">
                    {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                        <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-800">{stats.activeNow}</p>
                    <p className="text-sm text-slate-500 mt-1">Activos ahora</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-800">
                        {stats.scheduledToday}
                        <span className="text-lg text-slate-400 font-normal">/{stats.totalStaff}</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Turnos hoy</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-800">{stats.weekTotalShifts}</p>
                    <p className="text-sm text-slate-500 mt-1">Esta semana</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
                        <Layers className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-3xl font-semibold text-slate-800">{stats.totalTemplates}</p>
                    <p className="text-sm text-slate-500 mt-1">Plantillas</p>
                </div>
            </div>

            {/* Estado del Personal - NUEVO */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="font-medium text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Estado del Personal Hoy
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* Activos */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-green-700">En turno ({activeStaff.length})</span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {activeStaff.length === 0 ? (
                                <p className="text-xs text-slate-400">Nadie en turno ahora</p>
                            ) : (
                                activeStaff.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                            {s.person.full_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-700 font-medium">{s.person.full_name}</p>
                                            <p className="text-[10px] text-slate-400">{s.shiftTime}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* En descanso */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Coffee className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-700">Descanso ({restingStaff.length})</span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {restingStaff.length === 0 ? (
                                <p className="text-xs text-slate-400">Todos tienen turno</p>
                            ) : (
                                restingStaff.slice(0, 5).map((s, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold">
                                            {s.person.full_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <p className="text-sm text-slate-600">{s.person.full_name}</p>
                                    </div>
                                ))
                            )}
                            {restingStaff.length > 5 && (
                                <p className="text-xs text-slate-400">+{restingStaff.length - 5} más</p>
                            )}
                        </div>
                    </div>

                    {/* Terminaron turno */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Terminaron ({finishedStaff.length})</span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {finishedStaff.length === 0 ? (
                                <p className="text-xs text-slate-400">Nadie ha terminado aún</p>
                            ) : (
                                finishedStaff.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                                            {s.person.full_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">{s.person.full_name}</p>
                                            <p className="text-[10px] text-slate-400">{s.shiftTime}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Vista de la Semana */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h2 className="font-medium text-slate-800">Próximos 7 días</h2>
                    </div>
                    <button
                        onClick={() => navigate('/app/scheduler')}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                    >
                        Ver todo <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-7">
                    {weekPreview.map((day, idx) => (
                        <div
                            key={day.date}
                            onClick={() => navigate('/app/scheduler')}
                            className={`p-4 text-center cursor-pointer transition-colors hover:bg-slate-50 
                                ${idx !== 6 ? 'border-r border-slate-100' : ''} 
                                ${day.isToday ? 'bg-blue-50/50' : ''}`}
                        >
                            <p className="text-xs text-slate-400 font-medium">{day.dayName}</p>
                            <p className={`text-xl font-medium mt-2 ${day.isToday
                                ? 'bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center mx-auto'
                                : 'text-slate-700'}`}>
                                {day.dayNumber}
                            </p>
                            <p className={`text-xs mt-3 font-medium ${day.shiftsCount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                {day.status !== 'OPEN' ? 'Cerrado' : day.shiftsCount > 0 ? `${day.shiftsCount} turnos` : 'Sin turnos'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/app/scheduler')}
                    className="group bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                               text-white p-6 rounded-2xl text-left transition-all hover:shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Planificador</h3>
                            <p className="text-blue-100 text-sm mt-1">Gestionar turnos semanales</p>
                        </div>
                        <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/app/staff')}
                    className="group bg-white border border-slate-200 hover:border-slate-300 
                               p-6 rounded-2xl text-left transition-all hover:shadow-md"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg text-slate-800">Personal</h3>
                            <p className="text-slate-500 text-sm mt-1">{stats.totalStaff} empleados activos</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>
        </div>
    );
}
