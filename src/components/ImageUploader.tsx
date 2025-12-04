'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
    onUpload: (files: File[]) => void;
    compact?: boolean;
}

export default function ImageUploader({ onUpload, compact = false }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(Array.from(e.target.files));
        }
    };

    return (
        <div
            className={`relative border-2 border-dashed rounded-xl text-center transition-all cursor-pointer group
        ${isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-blue-400 hover:bg-gray-800/50'
                }
        ${compact ? 'p-4' : 'p-12'}
        `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
            />
            <div className={`flex items-center justify-center gap-4 ${compact ? 'flex-row' : 'flex-col'}`}>
                <div className={`${compact ? 'p-2' : 'p-4'} bg-gray-800 rounded-full group-hover:bg-gray-700 transition-colors`}>
                    <Upload className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-blue-400`} />
                </div>
                <div className="text-left">
                    <h3 className={`${compact ? 'text-base' : 'text-lg'} font-medium text-gray-200`}>
                        {compact ? 'Click or drag to add more images' : 'Drag & drop or click to upload'}
                    </h3>
                    {!compact && <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG, WebP</p>}
                </div>
            </div>
        </div>
    );
}
