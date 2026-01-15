import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary atrapó un error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                    <div className="text-4xl mb-4">😵</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal en esta sección</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                        Hubo un problema al cargar los datos. No te preocupes, el resto de la app sigue funcionando.
                    </p>
                    <button
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.reload();
                        }}
                    >
                        Intentar Recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
