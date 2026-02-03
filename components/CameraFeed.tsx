
import React, { useEffect, useRef, useState } from 'react';
import { HandPosition } from '../types';

interface CameraFeedProps {
  onHandsDetected: (left: HandPosition, right: HandPosition) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onHandsDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Initialize MediaPipe Hands
    if (!(window as any).Hands) {
      console.error("MediaPipe Hands script not loaded");
      setCameraError("Tracking library not loaded");
      return;
    }

    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: any) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      let leftHand: HandPosition = { x: 0.5, y: 0.8, active: false };
      let rightHand: HandPosition = { x: 0.5, y: 0.8, active: false };

      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks: any, index: number) => {
          const handedness = results.multiHandedness[index];
          const label = handedness.label; // "Left" or "Right"
          const score = handedness.score; // Confidence score 0-1
          
          const pos = { 
            x: landmarks[8].x, 
            y: landmarks[8].y, 
            active: true 
          };
          
          if (label === 'Left') {
            leftHand = pos;
          } else {
            rightHand = pos;
          }

          // Draw detection box on canvas
          if (ctx && canvasRef.current) {
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            
            // Calculate bounding box
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            landmarks.forEach((lm: any) => {
              if (lm.x < minX) minX = lm.x;
              if (lm.x > maxX) maxX = lm.x;
              if (lm.y < minY) minY = lm.y;
              if (lm.y > maxY) maxY = lm.y;
            });

            // Add padding
            minX = Math.max(0, minX - 0.05);
            minY = Math.max(0, minY - 0.05);
            maxX = Math.min(1, maxX + 0.05);
            maxY = Math.min(1, maxY + 0.05);

            // Determine color based on confidence
            // Emerald for high, Amber for medium
            const color = score > 0.8 ? '#10b981' : '#f59e0b';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]); // Dotted border for a high-tech look
            
            // Draw rounded-style corners or simple box
            ctx.strokeRect(minX * w, minY * h, (maxX - minX) * w, (maxY - minY) * h);
            
            // Draw confidence indicator
            ctx.fillStyle = color;
            ctx.font = '8px monospace';
            ctx.fillText(`${Math.round(score * 100)}%`, minX * w, minY * h - 2);
          }
        });
      }
      onHandsDetected(leftHand, rightHand);
    });

    handsRef.current = hands;

    // Start Camera
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30 } },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            processVideo();
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("Could not access camera. Please check permissions.");
      }
    };

    const processVideo = async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && handsRef.current) {
        await handsRef.current.send({ image: videoRef.current });
      }
      requestRef.current = requestAnimationFrame(processVideo);
    };

    setupCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) handsRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onHandsDetected]);

  return (
    <div className="fixed bottom-4 right-4 w-64 h-48 rounded-xl border-2 border-slate-700 overflow-hidden shadow-2xl bg-black flex items-center justify-center transition-all duration-300">
      {cameraError ? (
        <div className="p-2 text-center">
          <p className="text-[10px] text-rose-500 font-bold uppercase">Camera Error</p>
          <p className="text-[8px] text-slate-400 mt-1 leading-tight">{cameraError}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute top-1 left-2 text-[10px] bg-black/50 px-1 rounded text-white/70 font-mono tracking-tighter pointer-events-none">
            LIVE FEED
          </div>
        </>
      )}
    </div>
  );
};

export default CameraFeed;
