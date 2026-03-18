class SynthAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true; // start enabled, can be toggled by user
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playBeep() {
    this.playTone(880, 'sine', 0.05, 0.05);
  }

  playHover() {
    this.playTone(440, 'triangle', 0.02, 0.02);
  }

  playClick() {
    this.playTone(660, 'square', 0.05, 0.03);
  }

  playAlert() {
    this.playTone(330, 'sawtooth', 0.3, 0.15);
    setTimeout(() => this.playTone(330, 'sawtooth', 0.3, 0.15), 150);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.4, 0.2);
  }

  playTyping() {
    this.playTone(2000 + Math.random() * 500, 'square', 0.02, 0.01);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const audio = new SynthAudio();
