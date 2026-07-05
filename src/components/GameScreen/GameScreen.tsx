import { useMemo, useState } from 'react';
import { Board } from '../Board/Board';
import { PlayerPanel } from '../PlayerPanel/PlayerPanel';
import { ActionBar } from '../ActionBar/ActionBar';
import { LogPanel } from '../LogPanel/LogPanel';
import { CardModal } from '../CardModal/CardModal';
import { LiquidateModal } from '../LiquidateModal/LiquidateModal';
import { CashFlowSettlementModal } from '../CashFlowSettlementModal/CashFlowSettlementModal';
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

  // 检测是否需要强制弹出租房选择（无自住房且不处于结束/设置阶段）
  const needsRentChoice = useMemo(() => {
    if (!currentPlayer) return false;
    if (state.phase === 'SETUP' || state.phase === 'GAME_OVER') return false;
    if (currentPlayer.isBankrupt) return false;
    const hasSelfLiving = currentPlayer.assets.some(a => a.type === 'realEstate' && a.isSelfLiving);
    return !hasSelfLiving;
  }, [currentPlayer, state.phase]);

  // 当检测到需要租房选择时弹出
  useMemo(() => {
    if (needsRentChoice && !showRentModal && state.phase !== 'SETUP') {
      setShowRentModal(true);
    }
  }, [needsRentChoice]);

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
