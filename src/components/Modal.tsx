import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    animationType?: 'fade' | 'slide-right' | 'slide-left' | 'slide-up';
}

export function Modal({ isOpen, onClose, title, children, animationType = 'fade' }: ModalProps) {
    if (!isOpen) return null;

    // Mapeo de tipos de animación a clases
    const animationClass = {
        'fade': 'animate-in fade-in zoom-in-95 duration-200',
        'slide-right': 'animate-slide-in-right',
        'slide-left': 'animate-slide-in-left',
        'slide-up': 'animate-slide-in-up'
    }[animationType];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
            <div className={cn(
                "bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden",
                animationClass
            )}>
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-normal text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}