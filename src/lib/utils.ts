import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { flushSync } from 'react-dom';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Ejecuta una actualización de estado dentro de una View Transition.
 * Soporta retrocompatibilidad si el navegador no tiene la API.
 */
export function startViewTransition(callback: () => void) {
    if (!document.startViewTransition) {
        callback();
        return;
    }

    document.startViewTransition(() => {
        flushSync(() => {
            callback();
        });
    });
}