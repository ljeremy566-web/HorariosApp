import { z } from 'zod';

// Validador para rangos de hora (Ej: "08:00")
const timeStringSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato inválido (HH:MM)"
});

// Validador para un bloque de horario
export const timeRangeSchema = z.object({
    start: timeStringSchema,
    end: timeStringSchema,
}).refine((data) => data.end > data.start, {
    message: "La hora de salida debe ser después de la entrada",
    path: ["end"],
});

// Validador principal para la Plantilla de Turno
export const shiftTemplateSchema = z.object({
    name: z.string()
        .min(3, "El nombre del turno debe tener al menos 3 letras")
        .max(50, "El nombre es muy largo"),

    code: z.string()
        .min(1, "El código es obligatorio")
        .max(5, "Máx 5 caracteres")
        .regex(/^[A-Z0-9]+$/, "Solo mayúsculas y números"),

    // CAMBIO IMPORTANTE: Aceptamos string simple porque usas nombres de colores (blue, red...)
    color: z.string().min(1, "Debes seleccionar un color"),

    schedule_config: z.array(timeRangeSchema)
        .min(1, "Debes agregar al menos un horario de trabajo"),
});

// Tipo inferido
export type CreateTemplateInput = z.infer<typeof shiftTemplateSchema>;
