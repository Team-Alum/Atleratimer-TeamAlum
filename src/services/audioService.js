// Web Audio API Sound Generator for Atleratimer
// Provides subtle completion chimes and ambient focus sounds (White Noise, Rain, Binaural)

class SoundService {
  constructor() {
    this.ctx = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
    this.ambientType = 'rain';
  }

  initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft zen completion chime
  playCompletionChime(soundType = 'zen') {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.connect(this.ctx.destination);
      masterGain.gain.setValueAtTime(0.3, now);

      if (soundType === 'beep') {
        // Crisp gentle double beep
        [now, now + 0.15].forEach((startTime) => {
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, startTime);
          noteGain.gain.setValueAtTime(0.2, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.12);
        });
        return;
      }

      // Default: Tibetan bowl / Zen chime harmonic chords (528Hz, 792Hz, 1056Hz)
      const frequencies = [528, 792, 1056, 1320];
      frequencies.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const decayTime = 2.5 + idx * 0.5;
        const initialGain = 0.25 / (idx + 1);

        noteGain.gain.setValueAtTime(initialGain, now);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + decayTime + 0.1);
      });
    } catch {
      // Audio playback suspended or not allowed yet
    }
  }

  // Toggle ambient focus sound
  toggleAmbient(enable, type = 'rain', volume = 0.15) {
    if (!enable) {
      this.stopAmbient();
      return false;
    }
    return this.startAmbient(type, volume);
  }

  startAmbient(type = 'rain', volume = 0.15) {
    try {
      this.initContext();
      if (!this.ctx) return false;

      this.stopAmbient();
      this.ambientType = type;

      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink/Brown noise generator for gentle rain or focus hum
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter to simulate soft rain / brownian focus
      const filter = this.ctx.createBiquadFilter();
      filter.type = type === 'whitenoise' ? 'allpass' : 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 400, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(volume, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      whiteNoise.start();
      this.ambientSource = whiteNoise;
      this.isAmbientPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch {
        // already stopped
      }
      this.ambientSource = null;
    }
    this.isAmbientPlaying = false;
  }
}

export const soundService = new SoundService();
