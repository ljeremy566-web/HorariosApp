import { useState, useEffect } from 'react';
import { DownloadCloud, Loader2, Calendar, Download, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { patternService } from '../../Services';
import { ConfirmModal } from '../common/ConfirmModal';

interface PatternModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (pattern: any) => void;
}

// --- MODAL DE PLANTILLAS ---
export function PatternModal({ isOpen, onClose, onApply }: PatternModalProps) {
    const [patterns, setPatterns] = useState<any[]>([]);
    const [loadingPat, setLoadingPat] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'default' | 'danger';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    useEffect(() => {
        if (isOpen) {
            setLoadingPat(true);
            patternService.getAll()
                .then((data) => { setPatterns(data); setLoadingPat(false); })
                .catch(() => setLoadingPat(false));
        }
    }, [isOpen]);

    const apply = (p: any) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Aplicar plantilla',
            message: `¿Aplicar "${p.name}" al calendario actual ? `,
            onConfirm: () => {
                onApply(p);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const remove = (id: string, name: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar plantilla',
            message: `¿Eliminar "${name}" permanentemente ? `,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await patternService.delete(id);
                    setPatterns(patterns.filter(p => p.id !== id));
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    toast.success('Plantilla eliminada');
                } catch (e) {
                    toast.error('Error eliminando plantilla');
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-backdrop-fade">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-modal-scale flex flex-col max-h-[80vh]">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-medium text-lg text-slate-800 flex items-center gap-2">
                            <DownloadCloud size={20} className="text-blue-600" />
                            Cargar Plantilla
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loadingPat && <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                        {!loadingPat && patterns.length === 0 && (
                            <div className="py-8 text-center text-slate-400">
                                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay plantillas guardadas</p>
                            </div>
                        )}
                        {patterns.map(p => (
                            <div key={p.id} className="flex justify-between p-4 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50/50 transition-all items-center group">
                                <div>
                                    <div className="font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{p.area}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => apply(p)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                                        <Download size={16} />
                                    </button>
                                    <button onClick={() => remove(p.id, p.name)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}
