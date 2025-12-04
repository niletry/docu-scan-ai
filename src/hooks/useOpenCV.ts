import { useState, useEffect } from 'react';

export function useOpenCV() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Check if already loaded
        if ((window as any).cv && (window as any).cv.Mat) {
            setLoaded(true);
            return;
        }

        // Check if script is already in DOM
        const OPENCV_URL = 'https://docs.opencv.org/4.8.0/opencv.js';
        if (document.querySelector(`script[src="${OPENCV_URL}"]`)) {
            // If script exists but cv not ready, we might need to poll or wait
            // For simplicity, we assume it will trigger onRuntimeInitialized
            return;
        }

        const script = document.createElement('script');
        script.src = OPENCV_URL;
        script.async = true;
        script.onload = () => {
            if ((window as any).cv) {
                (window as any).cv['onRuntimeInitialized'] = () => {
                    setLoaded(true);
                    console.log('OpenCV.js is ready');
                };
            }
        };
        document.body.appendChild(script);
    }, []);

    return loaded;
}
