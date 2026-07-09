import { useState } from 'react';
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
import { AssetCenter } from '../AssetCenter/AssetCenter';
import { useAIPlayer } from '../../hooks/useAIPlayer';
import { useAutoTestAgent } from '../../hooks/useAutoTestAgent';
import { AutoTestPanel } from '../AutoTestPanel/AutoTestPanel';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const { state } = useGame();
  const actions = useGameActions();
  useAIPlayer();
  useAutoTestAgent();

  const [showAssetCenter, setShowAssetCenter] = useState(false);

  const currentPlayer = state.players[state.currentPlayerIndex];

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
      {state.deferredCard && state.phase !== 'CARD_DECISION' && (
        <div className={styles.deferredBanner} onClick={actions.resumeCard}>
          <span>⏸ 有暂缓的卡片</span>
          <span className={styles.deferredLabel}>{state.deferredCard.title}</span>
          <span>点击恢复</span>
        </div>
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
