const scores = {
  signal: {
    seconds: 9.6,
    chords: [[48, 55, 62, 67], [45, 52, 59, 64], [41, 48, 55, 60], [43, 50, 57, 62]],
    melody: [[79, 74, 76], [76, 71, 74], [72, 67, 74], [74, 69, 71]],
    steps: [1.6, 4.8, 7.1], type: 'sine', cutoff: 1000,
  },
  playroom: {
    seconds: 7.2,
    chords: [[50, 57, 61, 66], [47, 54, 61, 64], [43, 50, 57, 62], [45, 52, 59, 64]],
    melody: [[78, 73, 81, 76], [76, 73, 78, 71], [74, 69, 78, 73], [76, 71, 73, 78]],
    steps: [0.6, 2.1, 4.2, 5.7], type: 'triangle', cutoff: 1600,
  },
  cartridge: {
    seconds: 8.8,
    chords: [[46, 53, 60, 65], [43, 50, 57, 62], [39, 46, 53, 58], [41, 48, 55, 60]],
    melody: [[77, 72, 70], [74, 69, 65], [70, 65, 72], [72, 67, 69]],
    steps: [1.1, 3.9, 6.1], type: 'triangle', cutoff: 1150,
  },
  pocket: {
    seconds: 8,
    chords: [[52, 59, 66, 71], [49, 56, 64, 68], [45, 52, 59, 64], [47, 54, 61, 66]],
    melody: [[83, 78, 76], [80, 76, 73], [76, 71, 78], [78, 73, 75]],
    steps: [1, 3.6, 6.2], type: 'sine', cutoff: 1300,
  },
};

export function createSoundscape(theme, onState = () => {}) {
  const score = scores[theme] ?? scores.signal;
  let context;
  let master;
  let analyser;
  let delay;
  let timer;
  let enabled = true;
  let engaged = false;
  let volume = 0.15;
  let nextBar = 0;
  let bar = 0;
  let revision = 0;
  let disposed = false;
  const voices = new Set();
  const frequency = note => 440 * 2 ** ((note - 69) / 12);

  function initialize() {
    if (context) return;
    context = new AudioContext({ latencyHint: 'playback' });
    master = context.createGain();
    master.gain.value = volume;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 18;
    limiter.ratio.value = 4;
    analyser = context.createAnalyser();
    analyser.fftSize = 512;
    master.connect(limiter).connect(analyser).connect(context.destination);
    delay = context.createDelay(1);
    delay.delayTime.value = theme === 'playroom' ? 0.3 : 0.46;
    const feedback = context.createGain();
    feedback.gain.value = 0.18;
    const wet = context.createGain();
    wet.gain.value = 0.18;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    context.onstatechange = () => onState(context.state);
  }

  function note(pitch, start, duration, amplitude, type = 'sine', pan = 0, pad = false) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const stereo = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.value = frequency(pitch);
    filter.type = 'lowpass';
    filter.frequency.value = pad ? 700 : score.cutoff;
    stereo.pan.value = pan;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(amplitude, start + (pad ? 1.2 : 0.014));
    if (pad) envelope.gain.setValueAtTime(amplitude, start + duration * 0.65);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(envelope).connect(stereo);
    stereo.connect(master);
    stereo.connect(delay);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); stereo.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function schedule() {
    if (!enabled || !engaged || document.hidden || disposed || context.state !== 'running') return;
    while (nextBar < context.currentTime + 1.2) {
      const chord = score.chords[bar % score.chords.length];
      chord.forEach((pitch, index) => note(pitch, nextBar, score.seconds + 1.4, 0.07, 'sine', (index - 1.5) * 0.18, true));
      score.melody[bar % score.melody.length].forEach((pitch, index) => {
        note(pitch, nextBar + score.steps[index], theme === 'signal' ? 3.8 : 2.2, 0.12, score.type, index % 2 ? 0.25 : -0.25);
      });
      nextBar += score.seconds;
      bar++;
    }
  }

  function clearVoices() {
    clearInterval(timer);
    timer = undefined;
    for (const oscillator of voices) {
      oscillator.onended?.();
      try { oscillator.stop(); } catch {}
    }
    voices.clear();
  }

  async function synchronize() {
    const current = ++revision;
    if (disposed || !enabled || !engaged || document.hidden) {
      clearVoices();
      if (context && context.state !== 'closed') await context.suspend().catch(() => {});
      onState(context ? context.state : 'waiting');
      return;
    }
    try {
      initialize();
      await context.resume();
      if (current !== revision || disposed) return;
      if (!timer && context.state === 'running') {
        nextBar = context.currentTime + 0.08;
        schedule();
        timer = setInterval(schedule, 500);
      }
      onState(context.state);
    } catch { onState('unavailable'); }
  }
  const visibility = () => { synchronize(); };
  document.addEventListener('visibilitychange', visibility);

  return {
    start() { engaged = true; return synchronize(); },
    pause() { engaged = false; return synchronize(); },
    setEnabled(value) { enabled = value; return synchronize(); },
    setVolume(value) {
      volume = Math.max(0, Math.min(0.3, value));
      if (master) master.gain.setTargetAtTime(volume, context.currentTime, 0.06);
    },
    cue(kind = 'select') {
      if (!enabled || !engaged || document.hidden || context?.state !== 'running') return;
      const pitches = kind === 'boot' ? [57, 64, 69, 76] : kind === 'open' ? [67, 74] : kind === 'close' ? [64, 57] : [69];
      const start = context.currentTime;
      pitches.forEach((pitch, index) => note(pitch, start + index * 0.095, kind === 'boot' ? 0.9 : 0.22, 0.2));
    },
    snapshot() {
      const waveform = new Float32Array(analyser?.fftSize ?? 512);
      analyser?.getFloatTimeDomainData(waveform);
      const rms = Math.sqrt(waveform.reduce((sum, sample) => sum + sample * sample, 0) / waveform.length);
      return { theme, enabled, engaged, state: context?.state ?? 'waiting', voices: voices.size, volume, scheduledBars: bar, rms };
    },
    dispose() {
      disposed = true; revision++;
      clearVoices();
      document.removeEventListener('visibilitychange', visibility);
      context?.close().catch(() => {});
    },
  };
}