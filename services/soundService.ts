
class SoundService {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private bgmTimeout: any = null;
  private isMusicMuted: boolean = false;
  private intensityScore: number = 0;
  private step: number = 0;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.05, this.ctx.currentTime);
    }
  }

  updateIntensity(score: number) {
    this.intensityScore = score;
  }

  playTargetHit() {
    this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx!.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.1);
  }

  playObstacleHit() {
    this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx!.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx!.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.2);
  }

  playBlip(isPause: boolean = true) {
    this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPause ? 440 : 660, this.ctx!.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.05);
  }

  playStart() {
    this.init();
    [440, 554, 659].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const time = this.ctx!.currentTime + i * 0.1;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(time);
      osc.stop(time + 0.1);
    });
  }

  playGameOver() {
    this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx!.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.8);
  }

  startBGM() {
    this.init();
    if (this.bgmTimeout) return;
    this.step = 0;
    this.scheduler();
  }

  private scheduler() {
    if (this.isMusicMuted || !this.ctx) {
       this.bgmTimeout = setTimeout(() => this.scheduler(), 500);
       return;
    }

    // Dynamic tempo: base 120bpm, increases with score (up to ~180bpm)
    const baseTempo = 120;
    const tempoBonus = Math.min(60, this.intensityScore / 25);
    const tempo = baseTempo + tempoBonus;
    const secondsPerBeat = 60 / tempo;

    // Kick drum style pulse every 4 beats
    if (this.step % 4 === 0) {
      this.playPulse(50, 0.15, 0.25, 'sine');
    }
    
    // Sub-pulse every beat
    this.playPulse(110, 0.05, 0.08, 'triangle');

    // Hi-hat noise every 2 beats when score > 300
    if (this.intensityScore > 300 && this.step % 2 === 1) {
      this.playNoise(0.03, 0.04);
    }

    // Snare-like snap on steps 2 and 4 when score > 800
    if (this.intensityScore > 800 && (this.step % 4 === 1 || this.step % 4 === 3)) {
      this.playPulse(250, 0.05, 0.1, 'square', 0.02);
    }

    // Random melody note frequency increases with intensity
    const melodyChance = this.intensityScore > 1200 ? 4 : 8;
    if (this.step % melodyChance === 0) {
      const notes = [261.63, 329.63, 392.00, 523.25, 587.33, 659.25]; // C, E, G, C, D, E
      const freq = notes[Math.floor(Math.random() * notes.length)];
      this.playPulse(freq, 0.15, 0.05, 'sine', 0.03);
    }

    this.step++;
    this.bgmTimeout = setTimeout(() => this.scheduler(), (secondsPerBeat * 1000) / 2); // 8th notes
  }

  private playNoise(dur: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    noise.connect(g);
    g.connect(this.musicGain);
    noise.start();
  }

  private playPulse(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', decay: number = 0.05) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (type === 'sine' && freq < 100) {
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    }

    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    
    osc.connect(g);
    g.connect(this.musicGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  stopBGM() {
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
    this.intensityScore = 0;
  }

  toggleMusicMute(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.isMusicMuted ? 0 : 0.05, this.ctx.currentTime, 0.1);
    }
    return this.isMusicMuted;
  }

  setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.isMusicMuted ? 0 : 0.05, this.ctx.currentTime, 0.1);
    }
  }
}

export const soundService = new SoundService();
