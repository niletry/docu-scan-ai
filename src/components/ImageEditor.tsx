'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { useOpenCV } from '@/hooks/useOpenCV';
import { Loader2, Check, RotateCcw, Wand2, Eye, Save } from 'lucide-react';

interface Point { x: number; y: number }

interface ImageEditorProps {
    imageUrl: string;
    initialProcessedUrl?: string | null;
    onSave: (processedUrl: string) => void;
    onCancel: () => void;
}

export default function ImageEditor({ imageUrl, initialProcessedUrl, onSave, onCancel }: ImageEditorProps) {
    const cvLoaded = useOpenCV();

    // Core State
    // NOTE: points are now stored in NATURAL image coordinates (pixels relative to original image)
    const [points, setPoints] = useState<Point[]>([]);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 }); // Display size
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 }); // Original size

    // Process State
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedUrl, setProcessedUrl] = useState<string | null>(initialProcessedUrl || null);
    const [isComparing, setIsComparing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const hasAutoProcessed = useRef(!!initialProcessedUrl);

    // Initialize
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        setImageSize({ width: rect.width, height: rect.height });
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };

    // Trigger auto-process
    useEffect(() => {
        if (initialProcessedUrl) return;

        if (cvLoaded && naturalSize.width > 0 && !hasAutoProcessed.current) {
            hasAutoProcessed.current = true;
            runAutoPipeline();
        }
    }, [cvLoaded, naturalSize, initialProcessedUrl]);

    // --- PIPELINE ---
    const runAutoPipeline = async () => {
        setIsProcessing(true);
        setErrorMsg(null);
        try {
            const detectedPoints = await detectPoints();
            setPoints(detectedPoints);
            const croppedUrl = await performCrop(detectedPoints);
            setProcessedUrl(croppedUrl);
        } catch (e: any) {
            console.error("Pipeline Failed:", e);
            setErrorMsg(e.message || "Processing failed");
        } finally {
            setIsProcessing(false);
        }
    };

    // Step 1: AI Detection
    const detectPoints = async (): Promise<Point[]> => {
        // Always load ORIGINAL image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // Compress for AI (1280px)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 1280;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        let scale = 1;

        if (w > maxDim || h > maxDim) {
            scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }

        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);

        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85));
        if (!blob) throw new Error("Image compression failed");

        const formData = new FormData();
        formData.append('image', blob);

        const res = await fetch('/api/detect', { method: 'POST', body: formData });
        if (!res.ok) throw new Error("AI Service Error");

        const data = await res.json();

        let rawPoints: number[][] = [];
        if (data.top_left) {
            rawPoints = [data.top_left, data.top_right, data.bottom_right, data.bottom_left];
        } else if (data.points) {
            rawPoints = data.points;
        } else {
            throw new Error("Invalid AI response format");
        }

        // Map 0-1000 scale to NATURAL Coordinates
        const scaleX = img.naturalWidth / 1000;
        const scaleY = img.naturalHeight / 1000;

        return rawPoints.map(p => ({
            x: p[0] * scaleX,
            y: p[1] * scaleY
        }));
    };

    // Step 2: OpenCV Cropping
    const performCrop = async (currentPoints: Point[]): Promise<string> => {
        const cv = (window as any).cv;
        if (!cv || !imageRef.current) throw new Error("OpenCV not ready");

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");

        // Use ORIGINAL image source for cropping quality
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise((resolve) => img.onload = resolve);

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const src = cv.imread(canvas);
        const dst = new cv.Mat();

        // Points are already in natural coordinates
        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            currentPoints[0].x, currentPoints[0].y,
            currentPoints[1].x, currentPoints[1].y,
            currentPoints[2].x, currentPoints[2].y,
            currentPoints[3].x, currentPoints[3].y
        ]);

        // Calculate destination size
        const wTop = Math.hypot(currentPoints[1].x - currentPoints[0].x, currentPoints[1].y - currentPoints[0].y);
        const wBot = Math.hypot(currentPoints[2].x - currentPoints[3].x, currentPoints[2].y - currentPoints[3].y);
        const hLeft = Math.hypot(currentPoints[3].x - currentPoints[0].x, currentPoints[3].y - currentPoints[0].y);
        const hRight = Math.hypot(currentPoints[2].x - currentPoints[1].x, currentPoints[2].y - currentPoints[1].y);

        const maxWidth = Math.max(wTop, wBot);
        const maxHeight = Math.max(hLeft, hRight);

        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            maxWidth, 0,
            maxWidth, maxHeight,
            0, maxHeight
        ]);

        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        cv.imshow(canvas, dst);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.9);

        src.delete(); dst.delete(); M.delete(); srcTri.delete(); dstTri.delete();

        return resultUrl;
    };

    // --- Interaction ---
    const handleConfirm = () => {
        if (processedUrl) onSave(processedUrl);
    };

    // Coordinate Helpers
    const toDisplay = (val: number, isX: boolean) => {
        if (naturalSize.width === 0) return 0;
        const scale = isX ? imageSize.width / naturalSize.width : imageSize.height / naturalSize.height;
        return val * scale;
    };

    const toNatural = (val: number, isX: boolean) => {
        if (imageSize.width === 0) return 0;
        const scale = isX ? naturalSize.width / imageSize.width : naturalSize.height / imageSize.height;
        return val * scale;
    };

    // Drag Logic
    const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
    const handleMouseDown = (index: number) => {
        if (!processedUrl || isComparing) setActivePointIndex(index);
    };
    const handleMouseMove = (e: MouseEvent) => {
        if (activePointIndex === null || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Calculate in Display coords first
        const displayX = Math.max(0, Math.min(imageSize.width, e.clientX - rect.left));
        const displayY = Math.max(0, Math.min(imageSize.height, e.clientY - rect.top));

        // Convert to Natural coords for storage
        setPoints(prev => {
            const next = [...prev];
            next[activePointIndex] = {
                x: toNatural(displayX, true),
                y: toNatural(displayY, false)
            };
            return next;
        });
    };
    const handleMouseUp = () => setActivePointIndex(null);

    const showOriginal = isProcessing || !processedUrl || isComparing;

    return (
        <div className="flex flex-col h-full w-full relative bg-gray-900">
            <div className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {isProcessing && (
                    <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                        <p className="text-lg font-medium">AI is detecting and cropping...</p>
                    </div>
                )}

                {errorMsg && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white">
                        <p className="text-red-400 mb-4">Error: {errorMsg}</p>
                        <button onClick={runAutoPipeline} className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200">
                            Retry
                        </button>
                    </div>
                )}

                <div ref={containerRef} className="relative shadow-2xl transition-all duration-300">
                    <img
                        ref={imageRef}
                        src={showOriginal ? imageUrl : processedUrl!}
                        onLoad={handleImageLoad}
                        className="max-h-[80vh] max-w-full object-contain pointer-events-none select-none"
                        draggable={false}
                    />

                    {/* Crop Overlay */}
                    {showOriginal && points.length === 4 && !isProcessing && (
                        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                            <polygon
                                points={points.map(p => `${toDisplay(p.x, true)},${toDisplay(p.y, false)}`).join(' ')}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                className="pointer-events-none"
                            />
                            {points.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={toDisplay(p.x, true)}
                                    cy={toDisplay(p.y, false)}
                                    r={8}
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="cursor-move hover:scale-125 transition-transform"
                                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(i); }}
                                />
                            ))}
                        </svg>
                    )}
                </div>
            </div>

            <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-8 shrink-0">
                <button onClick={onCancel} className="text-gray-300 hover:text-white">
                    Cancel
                </button>

                <div className="flex items-center gap-4">
                    {processedUrl && !isProcessing && (
                        <>
                            <div className="text-sm text-gray-400 mr-2">
                                {isComparing ? "Show Original" : "Show Result"}
                            </div>

                            <button
                                onMouseDown={() => setIsComparing(true)}
                                onMouseUp={() => setIsComparing(false)}
                                onMouseLeave={() => setIsComparing(false)}
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white flex items-center gap-2 active:scale-95 transition-all select-none"
                                title="Hold to Compare"
                            >
                                <Eye className="w-5 h-5" />
                                <span className="font-medium">Hold to Compare</span>
                            </button>

                            <div className="w-px h-6 bg-gray-600 mx-2" />
                        </>
                    )}

                    <button
                        onClick={runAutoPipeline}
                        disabled={isProcessing}
                        className="p-2 hover:bg-gray-700 rounded text-gray-300"
                        title="Re-detect"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={isProcessing || !processedUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                >
                    <Save className="w-4 h-4" />
                    Save Result
                </button>
            </div>
        </div>
    );
}
