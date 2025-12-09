import { useEffect, useState } from 'react';
import { resourceService } from '../Services/resourceServices';
import type { Resource } from '../types';
import { Plus, User, Box, Trash2, Loader2, Tag } from 'lucide-react'; // Importamos Tag para categorías
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // AHORA: 'type' es un string libre, por defecto 'General'
    const [formData, setFormData] = useState({ name: '', type: 'General', color: '#3b82f6' });

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            const data = await resourceService.getAll();
            setResources(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Guardamos lo que sea que hayas escrito en 'type'
            // @ts-ignore 
            await resourceService.create({ ...formData, metadata: {}, is_active: true });
            setIsModalOpen(false);
            loadResources();
            setFormData({ name: '', type: 'General', color: '#3b82f6' });
        } catch (error) {
            alert('Error al crear recurso');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este recurso?")) return;
        await resourceService.delete(id);
        loadResources();
    };

    // Lógica de Iconos INTELIGENTE y GENÉRICA
    const getIcon = (category: string) => {
        // Normalizamos a minúsculas para comparar
        const cat = category.toLowerCase();

        // Si la categoría suena a humano, ponemos icono de usuario
        if (cat.includes('empleado') || cat.includes('persona') || cat.includes('usuario') || cat.includes('staff')) {
            return <User className="w-5 h-5 text-blue-600" />;
        }
        // Para todo lo demás (Camiones, Guitarras, Salas), ponemos una Caja
        return <Box className="w-5 h-5 text-emerald-600" />;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-normal text-slate-800">Mis Recursos</h2>
                    <p className="text-slate-500 text-sm">Gestiona los elementos que vas a programar en el tiempo.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#c2e7ff] text-[#001d35] hover:shadow-md px-4 py-3 rounded-2xl flex items-center gap-2 font-medium transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Recurso
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((res) => (
                        <div key={res.id} className="group bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all relative">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-3 rounded-full bg-slate-50")}>
                                        {/* El icono se adapta solo */}
                                        {getIcon(res.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-800">{res.name}</h3>
                                        {/* Mostramos la categoría como una etiqueta pequeña */}
                                        <div className="flex items-center gap-1 mt-1">
                                            <Tag className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs text-slate-500 capitalize">{res.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(res.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {resources.length === 0 && (
                        <div className="col-span-3 text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                            No hay recursos creados. ¡Agrega el primero!
                        </div>
                    )}
                </div>
            )}

            {/* MODAL ACTUALIZADO - GENÉRICO */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Recurso">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Recurso</label>
                        <input
                            required
                            className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ej: Ibanez RG550, Camión 05, Sala de Juntas..."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría / Etiqueta</label>
                        {/* YA NO ES UN SELECT, ES UN INPUT LIBRE */}
                        <div className="relative">
                            <input
                                required
                                className="w-full pl-10 px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ej: Guitarra, Vehículo, Empleado..."
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            />
                            <Tag className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Esto sirve para agruparlos en el calendario.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 shadow-sm transition-all">
                            Guardar Recurso
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}