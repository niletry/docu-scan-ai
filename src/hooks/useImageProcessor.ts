import { useState, useCallback } from 'react';
import { useOpenCV } from './useOpenCV';

interface Point { x: number; y: number }

export function useImageProcessor() {
    const cvLoaded = useOpenCV();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processImage = useCallback(async (imageUrl: string): Promise<string> => {
        if (!cvLoaded) throw new Error("OpenCV not loaded");
        setIsProcessing(true);
        setError(null);

        try {
            // 1. Load Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;

            // 2. AI Detect
            // Compress for AI (max 1280px)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxDim = 1280;
            let w = naturalWidth;
            let h = naturalHeight;
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

            // Parse Points
            let rawPoints: number[][] = [];
            if (data.top_left) {
                rawPoints = [data.top_left, data.top_right, data.bottom_right, data.bottom_left];
            } else if (data.points) {
                rawPoints = data.points;
            } else {
                throw new Error("Invalid AI response format");
            }

            // Map AI points (0-1000 scale) to Natural Size
            const points = rawPoints.map(p => ({
                x: p[0] * (naturalWidth / 1000),
                y: p[1] * (naturalHeight / 1000)
            }));

            // 3. OpenCV Crop
            const cv = (window as any).cv;
            const srcCanvas = document.createElement('canvas');
            srcCanvas.width = naturalWidth;
            srcCanvas.height = naturalHeight;
            const srcCtx = srcCanvas.getContext('2d');
            srcCtx?.drawImage(img, 0, 0);

            const src = cv.imread(srcCanvas);
            const dst = new cv.Mat();

            const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                points[0].x, points[0].y,
                points[1].x, points[1].y,
                points[2].x, points[2].y,
                points[3].x, points[3].y
            ]);

            // Calculate destination size
            const wTop = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
            const wBot = Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y);
            const hLeft = Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y);
            const hRight = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);

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

            cv.imshow(srcCanvas, dst);
            const resultUrl = srcCanvas.toDataURL('image/jpeg', 0.9);

            // Cleanup
            src.delete(); dst.delete(); M.delete(); srcTri.delete(); dstTri.delete();

            return resultUrl;

        } catch (e: any) {
            console.error(e);
            setError(e.message);
            throw e;
        } finally {
            setIsProcessing(false);
        }
    }, [cvLoaded]);

    return { processImage, isProcessing, error, cvLoaded };
}
