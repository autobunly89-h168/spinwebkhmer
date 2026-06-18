/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Let's create an elegant, browser-native audio synthesizer using the Web Audio API
class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // A crisp mechanical "clack" tick sound
  public playTick(pitch: number = 1000, volume: number = 0.2) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Lowpass block for crisp woodblock-like tick
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      // Ignored if user context hadn't interacted yet
    }
  }

  // A winning fanfare sequence with multiple notes
  public playWin() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Synthesize a quick ascending major chord (C4, E4, G4, C5)
      const notes = [
        { freq: 261.63, delay: 0, duration: 0.15 }, // C4
        { freq: 329.63, delay: 0.15, duration: 0.15 }, // E4
        { freq: 392.00, delay: 0.3, duration: 0.15 }, // G4
        { freq: 523.25, delay: 0.45, duration: 0.6 }   // C5
      ];

      notes.forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.delay);

        // Add a slight vibrato to the last note to make it feel premium
        if (note.freq === 523.25) {
          osc.frequency.linearRampToValueAtTime(535.0, now + note.delay + 0.3);
          osc.frequency.linearRampToValueAtTime(515.0, now + note.delay + 0.5);
        }

        gain.gain.setValueAtTime(0, now + note.delay);
        gain.gain.linearRampToValueAtTime(0.3, now + note.delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + note.duration);

        osc.start(now + note.delay);
        osc.stop(now + note.delay + note.duration);
      });
    } catch (e) {
      // Sound interaction fallback
    }
  }

  // Short swoosh sound during spin initiation
  public playSwoosh() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.7);
    } catch (e) {
      // Ignored
    }
  }
}

export const audio = new AudioSynthesizer();
