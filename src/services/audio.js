class AudioController {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15; // Set global volume
    this.masterGain.connect(this.ctx.destination);
    this.enabled = true;
  }

  playTone(freq, type, duration, vol = 1, sweep = false) {
    if (!this.enabled || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  hover() {
    this.playTone(800, 'sine', 0.05, 0.3);
  }

  click() {
    this.playTone(1200, 'square', 0.1, 0.4);
  }

  alert() {
    this.playTone(400, 'sawtooth', 0.3, 0.8, true);
    setTimeout(() => this.playTone(400, 'sawtooth', 0.3, 0.8, true), 150);
  }

  warning() {
    this.playTone(600, 'triangle', 0.4, 0.6, true);
  }

  hack() {

    for(let i=0; i<10; i++) {
      setTimeout(() => {
        this.playTone(200 + i*100, 'square', 0.1, 0.5);
      }, i*50);
    }
  }

  init() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audio = new AudioController();

// Add global click listener to initialize audio context
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => audio.init(), { once: true });
}
