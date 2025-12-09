import { useNavigate } from 'react-router-dom';
import { triggerViewTransition, getNavigationDirection } from '../lib/view-transitions';

/**
 * Hook que envuelve useNavigate para activar View Transitions automáticamente.
 */
export function useTransitionNavigate() {
    const navigate = useNavigate();

    function navigateWithTransition(to: string, options?: { replace?: boolean; state?: any }) {
        // Determinar dirección automática
        const direction = getNavigationDirection(to);

        triggerViewTransition(direction, () => {
            navigate(to, options);
        });
    }

    return navigateWithTransition;
}
