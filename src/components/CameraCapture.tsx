import React, { useRef, useEffect, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera API is not supported in this browser or iframe environment.');
          return;
        }

        // Try environment-facing camera first, fallback to any available camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
        } catch (e) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
          setError('No camera device found on this system. You can upload an image or video file directly instead.');
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission was denied. Please allow camera permissions in your browser or upload a file.');
        } else {
          setError('Camera unavailable. You can upload a photo or document directly.');
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `satya_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
              onCapture(file);
            }
          },
          'image/jpeg',
          0.9
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Top Controls */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4 text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-sm font-bold font-mono">Live Camera Feed</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full max-w-2xl aspect-[4/3] bg-slate-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex items-center justify-center">
        {error ? (
          <div className="p-8 text-center text-red-400 space-y-4 max-w-md">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{error}</p>
              <p className="text-xs text-slate-400 mt-1">Select a photo, screenshot, or document from your device storage instead.</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose File from Device
              <input
                type="file"
                accept="image/*,video/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onCapture(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder Reticle */}
        <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
          <div className="flex justify-between text-[10px] font-mono text-white/50">
            <span>[+] ALIGN ARTIFACT</span>
            <span>SATYA OCR</span>
          </div>
          <div className="text-center text-[10px] font-mono text-white/50">PRESS SHUTTER TO CAPTURE</div>
        </div>
      </div>

      {/* Shutter Button */}
      {!error && (
        <div className="mt-6">
          <button
            onClick={takePhoto}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl"
            title="Take Photo"
          >
            <div className="w-12 h-12 rounded-full bg-white hover:bg-slate-200 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
