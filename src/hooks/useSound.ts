import { useCallback, useRef } from 'react';

export type SoundType = 'dice' | 'card' | 'payday' | 'expense' | 'buy' | 'sell' | 'win' | 'bankruptcy' | 'baby';

export function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioContext]);

  const playDice = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200 + Math.random() * 300, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.08);
    }
  }, [getAudioContext]);

  const playCard = useCallback(() => {
    playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.15, 'sine', 0.2), 80);
  }, [playTone]);

  const playPayday = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const frequencies = [523, 659, 784, 1047];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  }, [getAudioContext]);

  const playExpense = useCallback(() => {
    playTone(300, 0.3, 'sawtooth', 0.15);
    setTimeout(() => playTone(250, 0.3, 'sawtooth', 0.15), 100);
  }, [playTone]);

  const playBuy = useCallback(() => {
    playTone(440, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(554, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.2), 200);
  }, [playTone]);

  const playSell = useCallback(() => {
    playTone(659, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(554, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(440, 0.2, 'sine', 0.2), 200);
  }, [playTone]);

  const playWin = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const frequencies = [523, 659, 784, 1047, 1319];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  }, [getAudioContext]);

  const playBankruptcy = useCallback(() => {
    playTone(150, 0.5, 'sawtooth', 0.2);
    setTimeout(() => playTone(100, 0.6, 'sawtooth', 0.2), 200);
  }, [playTone]);

  const playBaby = useCallback(() => {
    playTone(600, 0.2, 'sine', 0.15);
    setTimeout(() => playTone(800, 0.3, 'sine', 0.15), 150);
  }, [playTone]);

  const play = useCallback((type: SoundType) => {
    switch (type) {
      case 'dice': return playDice();
      case 'card': return playCard();
      case 'payday': return playPayday();
      case 'expense': return playExpense();
      case 'buy': return playBuy();
      case 'sell': return playSell();
      case 'win': return playWin();
      case 'bankruptcy': return playBankruptcy();
      case 'baby': return playBaby();
    }
  }, [playDice, playCard, playPayday, playExpense, playBuy, playSell, playWin, playBankruptcy, playBaby]);

  return { play };
}
