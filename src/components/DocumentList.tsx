import { Wand2, X, Eye, Loader2, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface DocItem {
    id: string;
    originalUrl: string;
    currentUrl: string;
    isProcessed: boolean;
    isProcessing?: boolean;
}

interface DocumentListProps {
    documents: DocItem[];
    onRemove: (id: string) => void;
    onProcess: (id: string) => void;
    onView: (doc: DocItem) => void;
    onReorder: (newDocs: DocItem[]) => void;
}

export default function DocumentList({ documents, onRemove, onProcess, onView, onReorder }: DocumentListProps) {
    const [comparingId, setComparingId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [previewDocs, setPreviewDocs] = useState<DocItem[]>(documents);

    // Sync preview with props when not dragging
    useEffect(() => {
        if (!draggedId) {
            setPreviewDocs(documents);
        }
    }, [documents, draggedId]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;

        const oldIndex = previewDocs.findIndex(d => d.id === draggedId);
        const newIndex = previewDocs.findIndex(d => d.id === targetId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newDocs = [...previewDocs];
            const [movedItem] = newDocs.splice(oldIndex, 1);
            newDocs.splice(newIndex, 0, movedItem);
            setPreviewDocs(newDocs);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onReorder(previewDocs);
        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {previewDocs.map((doc) => (
                <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc.id)}
                    onDragOver={(e) => handleDragOver(e, doc.id)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`group relative aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden border transition-all duration-200 shadow-lg 
                        ${draggedId === doc.id ? 'opacity-40 scale-95 border-blue-500 border-dashed ring-2 ring-blue-500/50' : 'border-gray-700 hover:border-blue-500/50 hover:shadow-blue-900/20'}
                    `}
                >
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white/70 hover:text-white p-1 bg-black/20 rounded backdrop-blur-sm">
                        <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Image Area */}
                    <div
                        className="w-full h-full cursor-pointer"
                        onClick={() => onView(doc)}
                    >
                        <img
                            src={comparingId === doc.id ? doc.originalUrl : doc.currentUrl}
                            alt="Document"
                            className={`w-full h-full object-cover transition-opacity duration-200 ${doc.isProcessing ? 'opacity-50' : 'opacity-100'}`}
                        />
                    </div>

                    {/* Loading Overlay */}
                    {doc.isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                            </div>
                        </div>
                    )}

                    {/* Actions Overlay (Hover) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                        <div className="flex justify-between items-center pointer-events-auto">

                            {/* Left: Process / Compare */}
                            {doc.isProcessed ? (
                                <button
                                    className="p-2 bg-gray-700/80 hover:bg-blue-600 text-white rounded-lg backdrop-blur-sm transition-colors"
                                    onMouseDown={() => setComparingId(doc.id)}
                                    onMouseUp={() => setComparingId(null)}
                                    onMouseLeave={() => setComparingId(null)}
                                    title="Hold to Compare"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onProcess(doc.id); }}
                                    disabled={doc.isProcessing}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="AI Processing"
                                >
                                    <Wand2 className="w-4 h-4" />
                                </button>
                            )}

                            {/* Right: Remove */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(doc.id); }}
                                className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"
                                title="Remove"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Status Badge */}
                    {doc.isProcessed && (
                        <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm pointer-events-none">
                            AI Optimized
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
