import { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useSound } from '../../hooks/useSound';

export function SoundEffects() {
  const { state } = useGame();
  const { play } = useSound();
  const lastLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    const lastLog = state.logs[state.logs.length - 1];
    if (!lastLog || lastLog.id === lastLogIdRef.current) return;
    lastLogIdRef.current = lastLog.id;

    const message = lastLog.message;
    const type = lastLog.type;

    if (type === 'move') {
      // 移动音效较频繁，可以省略或播放轻微音效
      return;
    }

    if (type === 'income') {
      play('payday');
      return;
    }

    if (type === 'expense') {
      if (message.includes('孩子')) {
        play('baby');
      } else {
        play('expense');
      }
      return;
    }

    if (type === 'asset') {
      if (message.includes('卖出')) {
        play('sell');
      } else if (message.includes('购买') || message.includes('买入')) {
        play('buy');
      }
      return;
    }

    if (type === 'market') {
      play('card');
      return;
    }

    if (type === 'system') {
      if (message.includes('破产')) {
        play('bankruptcy');
      }
      return;
    }

    if (type === 'win') {
      play('win');
      return;
    }
  }, [state.logs, play]);

  return null;
}
