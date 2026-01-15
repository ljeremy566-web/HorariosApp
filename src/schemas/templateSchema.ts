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
    message: "La hora fin debe ser posterior al inicio",
    path: ["end"],
});

// Validador principal para la Plantilla (ShiftTemplate)
export const shiftTemplateSchema = z.object({
    name: z.string()
        .min(3, "El nombre debe tener al menos 3 letras")
        .max(50, "El nombre es muy largo"),

    code: z.string()
        .min(1, "El código es obligatorio")
        .max(5, "Máximo 5 caracteres")
        .regex(/^[A-Z0-9]+$/, "Solo mayúsculas y números"),

    color: z.string()
        .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Debe ser un color Hex válido (ej. #FF0000)"),

    schedule_config: z.array(timeRangeSchema)
        .min(1, "Debes agregar al menos un rango de horario"),
});

// Tipo inferido para usar en tus formularios
export type CreateTemplateInput = z.infer<typeof shiftTemplateSchema>;
