import { addDays, format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AvailabilityConfig, DayAvailability } from '../types';

/**
 * Genera una lista de disponibilidad para un número determinado de días.
 * 
 * @param startDate Fecha de inicio (por defecto hoy)
 * @param daysCount Cantidad de días a generar (por defecto 15)
 * @param config Configuración de reglas (días laborales y feriados)
 * @returns Lista de objetos DayAvailability
 */
export function generateAvailability(
    config: AvailabilityConfig,
    startDate: Date = new Date(),
    daysCount: number = 15
): DayAvailability[] {
    const result: DayAvailability[] = [];

    // Normalizamos la fecha de inicio para evitar horas/minutos
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < daysCount; i++) {
        const currentDate = addDays(start, i);
        const dateString = format(currentDate, 'yyyy-MM-dd');
        // 'eeee' da el nombre completo del día (e.g. "lunes", "martes")
        // Capitalizamos la primera letra
        let dayName = format(currentDate, 'eeee', { locale: es });
        dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        const dayOfWeek = getDay(currentDate); // 0 = Domingo, 1 = Lunes, ...

        // Lógica de Estado
        let status: 'OPEN' | 'CLOSED' | 'DISABLED_BY_RULE' = 'OPEN';
        let reason: string | undefined = undefined;

        // 1. Chequear feriados (Prioridad Alta)
        const holiday = config.holidays.find(h => h.date === dateString);
        if (holiday) {
            status = 'CLOSED';
            reason = holiday.reason;
        }
        // 2. Chequear reglas de días laborales (Si no es feriado)
        else if (!config.workingDays.includes(dayOfWeek)) {
            status = 'DISABLED_BY_RULE';
        }

        result.push({
            date: dateString,
            dayName,
            status,
            reason,
            slots: []
        });
    }

    return result;
}
