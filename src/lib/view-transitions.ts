import { flushSync } from 'react-dom';

const SESSION_KEY = 'view-transition-history';

function getHistoryStack(): string[] {
    try {
        const item = sessionStorage.getItem(SESSION_KEY);
        return item ? JSON.parse(item) : [window.location.pathname];
    } catch {
        return [window.location.pathname];
    }
}

function setHistoryStack(stack: string[]) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stack));
    } catch (e) {
        console.warn('Failed to save history stack', e);
    }
}

/**
 * Determina la dirección de la navegación basándose en un historial simple de sesión.
 */
export function getNavigationDirection(toPath: string): 'next' | 'prev' {
    const stack = getHistoryStack();

    // Si vamos a la misma página, no importa
    if (toPath === window.location.pathname) return 'next';

    // Ver si 'toPath' está en el stack (es decir, estamos volviendo atrás)
    const index = stack.indexOf(toPath);

    if (index !== -1) {
        // Está en el stack, asumimos que es "VOLVER" (prev)
        // Cortamos el stack hasta ese punto para el futuro
        const newStack = stack.slice(0, index + 1);
        setHistoryStack(newStack);
        return 'prev';
    } else {
        // No está, es "AVANZAR" (next)
        // Agregamos al stack
        stack.push(toPath);
        setHistoryStack(stack);
        return 'next';
    }
}

/**
 * Agrega las clases de dirección al documento para activar las animaciones CSS.
 */
function applyDirectionClasses(direction: 'next' | 'prev') {
    const root = document.documentElement;
    // Limpiar clases previas para evitar conflictos
    root.classList.remove('direction-next', 'direction-prev');
    // Agregar la nueva clase
    root.classList.add(`direction-${direction}`);
}

/**
 * Limpia las clases de dirección después de la transición.
 */
function cleanupDirectionClasses() {
    const root = document.documentElement;
    root.classList.remove('direction-next', 'direction-prev');
}

/**
 * Ejecuta una View Transition con dirección.
 * @param direction 'next' (slide left) o 'prev' (slide right)
 * @param callback Función que actualiza el estado (navegación)
 */
export async function triggerViewTransition(
    direction: 'next' | 'prev',
    callback: () => void
) {
    // Si el navegador no soporta View Transitions, ejecuta el callback directamente
    if (!document.startViewTransition) {
        callback();
        return;
    }

    // 1. Aplicar clase de dirección
    applyDirectionClasses(direction);

    try {
        // 2. Iniciar la transición
        const transition = document.startViewTransition(() => {
            // 3. Actualizar el DOM (Navegación)
            // Usamos flushSync para asegurar que React actualice el DOM sincrónicamente
            // antes de que el navegador capture la "nueva" vista.
            flushSync(() => {
                callback();
            });
        });

        // 4. Esperar a que termine para limpiar
        await transition.finished;
    } finally {
        cleanupDirectionClasses();
    }
}
