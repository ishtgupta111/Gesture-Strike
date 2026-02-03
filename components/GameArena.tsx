
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameRule, GameObject, HandPosition } from '../types';
import { Heart, Shield, Zap, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { soundService } from '../services/soundService';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface TrailNode {
  x: number;
  y: number;
  active: boolean;
}

interface GameArenaProps {
  rule: GameRule;
  leftHand: HandPosition;
  rightHand: HandPosition;
  onGameOver: (score: number) => void;
  initialLives?: number;
  initialScore?: number;
}

const GameArena: React.FC<GameArenaProps> = ({ 
  rule, 
  leftHand, 
  rightHand, 
  onGameOver,
  initialLives = 3,
  initialScore = 0
}) => {
  const [score, setScore] = useState(initialScore);
  const [lives, setLives] = useState(initialLives);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [leftTrail, setLeftTrail] = useState<TrailNode[]>([]);
  const [rightTrail, setRightTrail] = useState<TrailNode[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bassFactor, setBassFactor] = useState(0);
  
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const objectsRef = useRef<GameObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(initialScore);
  const lastScoreIntensityRef = useRef(initialScore);

  const laneWidth = window.innerWidth / 2;

  const togglePause = (val: boolean) => {
    soundService.playBlip(val);
    setIsPaused(val);
    if (val) {
      soundService.stopBGM();
    } else {
      soundService.startBGM();
    }
  };

  const toggleMute = () => {
    const newMutedState = soundService.toggleMusicMute();
    setIsMuted(newMutedState);
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    const count = 12;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      newParticles.push({
        id: Math.random() + Date.now(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
        size: Math.random() * 6 + 4
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  const spawnObject = useCallback(() => {
    const lane: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
    const type: 'target' | 'avoid' = Math.random() > 0.4 ? 'target' : 'avoid';
    
    const baseSpeed = 4 + (scoreRef.current / 250);
    const speedVariation = Math.random() * (baseSpeed * 0.3);
    
    const newObj: GameObject = {
      id: Date.now(),
      type,
      x: (lane === 'left' ? 0 : laneWidth) + (laneWidth / 2),
      y: -50,
      lane,
      emoji: type === 'target' ? rule.targetEmoji : rule.avoidEmoji,
      speed: baseSpeed + speedVariation,
      hit: false,
    };
    
    objectsRef.current.push(newObj);
  }, [rule, laneWidth]);

  const updateVisualizer = () => {
    const data = soundService.getFrequencyData();
    if (data.length > 0) {
      const bassRange = data.slice(0, 10);
      const avgBass = bassRange.reduce((a, b) => a + b, 0) / bassRange.length;
      setBassFactor(avgBass / 255);
    } else {
      setBassFactor(0);
    }
  };

  const update = (time: number) => {
    if (isPaused) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    updateVisualizer();

    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      spawnTimerRef.current += deltaTime;

      const currentSpawnInterval = Math.max(350, 1000 - Math.floor(scoreRef.current / 150) * 80);

      if (spawnTimerRef.current > currentSpawnInterval) {
        spawnObject();
        spawnTimerRef.current = 0;
      }

      if (scoreRef.current !== lastScoreIntensityRef.current) {
        soundService.updateIntensity(scoreRef.current);
        lastScoreIntensityRef.current = scoreRef.current;
      }

      // Update Trails
      const leftX = (1 - leftHand.x) * laneWidth;
      const leftY = leftHand.active ? leftHand.y * window.innerHeight : window.innerHeight - 150;
      const rightX = (1 - rightHand.x) * laneWidth;
      const rightY = rightHand.active ? rightHand.y * window.innerHeight : window.innerHeight - 150;

      setLeftTrail(prev => [{ x: leftX, y: leftY, active: leftHand.active }, ...prev].slice(0, 8));
      setRightTrail(prev => [{ x: rightX, y: rightY, active: rightHand.active }, ...prev].slice(0, 8));

      // Update Particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // Gravity effect
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0);
      setParticles([...particlesRef.current]);

      // Update Objects
      const currentObjects = objectsRef.current.map(obj => ({
        ...obj,
        y: obj.y + obj.speed,
      })).filter(obj => obj.y < window.innerHeight + 100);

      const nextObjects: GameObject[] = [];

      currentObjects.forEach(obj => {
        if (obj.hit) return;

        const hand = obj.lane === 'left' ? leftHand : rightHand;
        const uiHandX = (1 - hand.x) * laneWidth;
        const uiHandY = hand.y * window.innerHeight;

        const stickX = (obj.lane === 'left' ? 0 : laneWidth) + (hand.active ? uiHandX : laneWidth / 2);
        const stickY = hand.active ? uiHandY : window.innerHeight - 150;

        const dist = Math.sqrt(Math.pow(obj.x - stickX, 2) + Math.pow(obj.y - stickY, 2));
        
        let hitThreshold = 45; 
        if (obj.type === 'target') {
          hitThreshold = obj.lane === 'left' ? 85 : 55;
        }

        if (dist < hitThreshold) {
          obj.hit = true;
          if (obj.type === 'target') {
            scoreRef.current += 10;
            setScore(scoreRef.current);
            soundService.playTargetHit();
            spawnParticles(obj.x, obj.y, obj.lane === 'left' ? '#3b82f6' : '#f43f5e');
          } else {
            soundService.playObstacleHit();
            setLives(l => {
              const newLives = l - 1;
              if (newLives <= 0) {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                onGameOver(scoreRef.current);
              }
              return newLives;
            });
          }
        } else {
          nextObjects.push(obj);
        }
      });

      objectsRef.current = nextObjects;
      setObjects([...nextObjects]);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    soundService.startBGM();
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      soundService.stopBGM();
    };
  }, [leftHand, rightHand, isPaused]);

  return (
    <div className="relative w-full h-full overflow-hidden flex transition-colors duration-200" style={{
        backgroundColor: `rgba(15, 23, 42, ${1 - bassFactor * 0.2})`
    }}>
      {/* Background Visualizer Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 transition-transform duration-100"
        style={{
            background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, ${bassFactor * 0.5}), transparent 70%)`,
            transform: `scale(${1 + bassFactor * 0.1})`
        }}
      />

      <div 
        className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-800/50 shadow-[0_0_15px_rgba(30,41,59,0.5)] z-0" 
        style={{
            boxShadow: `0 0 ${15 + bassFactor * 30}px rgba(59, 130, 246, ${0.2 + bassFactor * 0.8})`,
            backgroundColor: bassFactor > 0.5 ? '#3b82f6' : 'rgba(30, 41, 59, 0.5)'
        }}
      />

      {/* Rules Display */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">{rule.category}</h2>
        <div className="flex gap-4 items-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400 font-semibold uppercase">Hit:</span>
            <span className="text-2xl">{rule.targetEmoji}</span>
            <span className="text-sm font-medium">{rule.target}</span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 font-semibold uppercase">Avoid:</span>
            <span className="text-2xl">{rule.avoidEmoji}</span>
            <span className="text-sm font-medium">{rule.avoid}</span>
          </div>
        </div>
      </div>

      {/* HUD: Score, Lives, Pause, Mute */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 bg-blue-600/20 px-4 py-2 rounded-lg border border-blue-500/30">
            <Zap className={`w-5 h-5 text-blue-400 fill-blue-400 transition-transform duration-75`} style={{ transform: `scale(${1 + bassFactor * 0.4})` }} />
            <span className="text-2xl font-mono font-bold text-blue-100">{score.toString().padStart(5, '0')}</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: initialLives > 3 ? initialLives : 3 }).map((_, i) => (
              <Heart 
                key={i} 
                className={`w-6 h-6 transition-transform duration-100 ${i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`} 
                style={{ transform: i < lives ? `scale(${1 + bassFactor * 0.15})` : 'none', opacity: (i >= 3 && i >= lives) ? 0 : 1 }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={toggleMute}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95"
            title={isMuted ? "Unmute Music" : "Mute Music"}
          >
            {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
          </button>
          <button 
            onClick={() => togglePause(true)}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/10 transition-all active:scale-95"
            title="Pause Game"
          >
            <Pause className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.life,
            transform: `translate(-50%, -50%) scale(${p.life})`,
            boxShadow: `0 0 10px ${p.color}`
          }}
        />
      ))}

      {/* Left Stick Trail */}
      {!isPaused && leftTrail.map((node, i) => (
        <div 
          key={`ltrail-${i}`}
          className="absolute w-2 h-24 bg-blue-500/30 rounded-full pointer-events-none transition-opacity duration-150"
          style={{
            left: node.x,
            top: node.y - 48,
            transform: `translateX(-50%) scale(${0.9 - (i * 0.1)})`,
            opacity: node.active ? 0.3 * (1 - i / leftTrail.length) : 0,
            boxShadow: `0 0 ${10 - i}px #3b82f6`
          }}
        />
      ))}

      {/* Right Stick Trail */}
      {!isPaused && rightTrail.map((node, i) => (
        <div 
          key={`rtrail-${i}`}
          className="absolute w-2 h-24 bg-rose-500/30 rounded-full pointer-events-none transition-opacity duration-150"
          style={{
            left: laneWidth + node.x,
            top: node.y - 48,
            transform: `translateX(-50%) scale(${0.9 - (i * 0.1)})`,
            opacity: node.active ? 0.3 * (1 - i / rightTrail.length) : 0,
            boxShadow: `0 0 ${10 - i}px #f43f5e`
          }}
        />
      ))}

      {/* Left Stick (Blue) */}
      <div 
        className="absolute w-2 h-24 bg-blue-500 shadow-[0_0_20px_#3b82f6] rounded-full transition-all duration-75 pointer-events-none"
        style={{
          left: (1 - leftHand.x) * laneWidth,
          top: (leftHand.active ? leftHand.y * window.innerHeight : window.innerHeight - 150) - 48,
          transform: `translateX(-50%) scale(${1 + bassFactor * 0.2})`,
          opacity: isPaused ? 0.3 : 1,
          boxShadow: `0 0 ${20 + bassFactor * 40}px #3b82f6`
        }}
      />
      
      {/* Right Stick (Red) */}
      <div 
        className="absolute w-2 h-24 bg-rose-500 shadow-[0_0_20px_#f43f5e] rounded-full transition-all duration-75 pointer-events-none"
        style={{
          left: laneWidth + ((1 - rightHand.x) * laneWidth),
          top: (rightHand.active ? rightHand.y * window.innerHeight : window.innerHeight - 150) - 48,
          transform: `translateX(-50%) scale(${1 + bassFactor * 0.2})`,
          opacity: isPaused ? 0.3 : 1,
          boxShadow: `0 0 ${20 + bassFactor * 40}px #f43f5e`
        }}
      />

      {/* Game Objects */}
      {objects.map(obj => (
        <div
          key={obj.id}
          className="absolute text-4xl select-none pointer-events-none drop-shadow-lg transition-opacity duration-200"
          style={{
            left: obj.x,
            top: obj.y,
            transform: `translate(-50%, -50%) scale(${1 + bassFactor * 0.1})`,
            opacity: isPaused ? 0.2 : 1
          }}
        >
          {obj.emoji}
        </div>
      ))}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-40">
          <div className="text-center p-12 bg-slate-900/90 rounded-[3rem] border border-white/10 shadow-2xl max-w-sm w-full transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <Pause className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-4xl font-black mb-2 tracking-tight">PAUSED</h3>
            <p className="text-slate-400 mb-10 font-medium">Take a breather, the AI is waiting.</p>
            <button
              onClick={() => togglePause(false)}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              <Play className="w-6 h-6 fill-current" />
              RESUME
            </button>
          </div>
        </div>
      )}

      {/* Hands Detection Overlay */}
      {!isPaused && !leftHand.active && !rightHand.active && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
          <div className="text-center p-8 bg-slate-900/80 rounded-3xl border border-white/10 max-w-sm">
            <h3 className="text-3xl font-bold mb-4">Hands Not Detected</h3>
            <p className="text-slate-400 mb-6 leading-relaxed">Please place your hands in view of the camera to control the strikers.</p>
            <div className="flex justify-center gap-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500 animate-pulse flex items-center justify-center text-blue-400 font-bold">L</div>
                <span className="text-[10px] text-blue-400 uppercase font-bold">Blue Striker</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500 animate-pulse flex items-center justify-center text-rose-400 font-bold">R</div>
                <span className="text-[10px] text-rose-400 uppercase font-bold">Red Striker</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameArena;
