import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '../Board/Board';
import { PlayerPanel } from '../PlayerPanel/PlayerPanel';
import { ActionBar } from '../ActionBar/ActionBar';
import { LogPanel } from '../LogPanel/LogPanel';
import { CardModal } from '../CardModal/CardModal';
import { LiquidateModal } from '../LiquidateModal/LiquidateModal';
import { CashFlowSettlementModal } from '../CashFlowSettlementModal/CashFlowSettlementModal';
import { DivorceModal } from '../DivorceModal/DivorceModal';
import { WinScreen } from '../WinScreen/WinScreen';
import { SoundEffects } from '../SoundEffects/SoundEffects';
import { RentModal } from '../RentModal/RentModal';
import { AssetCenter } from '../AssetCenter/AssetCenter';
import { useAIPlayer } from '../../hooks/useAIPlayer';
import { useAutoTestAgent } from '../../hooks/useAutoTestAgent';
import { AutoTestPanel } from '../AutoTestPanel/AutoTestPanel';
import { useGame } from '../../context/GameContext';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const { state } = useGame();
  useAIPlayer();
  useAutoTestAgent();

  const [showRentModal, setShowRentModal] = useState(false);
  const [showAssetCenter, setShowAssetCenter] = useState(false);

  const currentPlayer = state.players[state.currentPlayerIndex];

  // 检测玩家是否有自住房
  const hasSelfLiving = useMemo(() => {
    if (!currentPlayer) return false;
    if (state.phase === 'SETUP' || state.phase === 'GAME_OVER') return false;
    if (currentPlayer.isBankrupt) return false;
    return currentPlayer.assets.some(a => a.type === 'realEstate' && a.isSelfLiving);
  }, [currentPlayer, state.phase]);

  // 【修复】仅在「从有房变成无房」的瞬间弹出一次租房选择
  const prevHasSelfLiving = useRef<boolean | null>(null);
  useEffect(() => {
    // 初始化时记录当前状态但不弹出
    if (prevHasSelfLiving.current === null) {
      prevHasSelfLiving.current = hasSelfLiving;
      return;
    }
    // 从有房变为无房时弹出
    if (prevHasSelfLiving.current === true && hasSelfLiving === false && !showRentModal) {
      setShowRentModal(true);
    }
    prevHasSelfLiving.current = hasSelfLiving;
  }, [hasSelfLiving]);

  return (
    <div className={styles.screen}>
      <div className={styles.mainLayout}>
        <div className={styles.boardArea}>
          <Board />
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#3498db' }} />机会</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#f1c40f' }} />市场</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#e74c3c' }} />额外支出</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#9b59b6' }} />慈善</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#ff9ff3' }} />生孩子</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: '#7f8c8d' }} />结算</div>
          </div>
        </div>
        <div className={styles.sideArea}>
          <PlayerPanel />
        </div>
      </div>
      <ActionBar onOpenAssetCenter={() => setShowAssetCenter(true)} />
      <LogPanel />
      <CardModal />
      <LiquidateModal />
      <CashFlowSettlementModal />
      <DivorceModal />
      <WinScreen />
      <SoundEffects />
      {state.testMode && <AutoTestPanel />}
      {showRentModal && currentPlayer && (
        <RentModal
          forced
          onClose={() => setShowRentModal(false)}
        />
      )}
      {showAssetCenter && currentPlayer && (
        <AssetCenter
          player={currentPlayer}
          onClose={() => setShowAssetCenter(false)}
        />
      )}
    </div>
  );
}
