import React from 'react';

// --- MODAL DE CONFIRMACIÓN (Google Style) ---
interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}

export function ConfirmModal({
    isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'default'
}: ConfirmModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-backdrop-fade">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-modal-scale">
                <div className="p-6">
                    <h3 className="font-medium text-xl text-slate-900 mb-3">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
                </div>
                <div className="flex justify-end gap-2 px-6 pb-6">
                    <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${variant === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}
