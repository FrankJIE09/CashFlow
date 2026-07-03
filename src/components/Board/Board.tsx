import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { SPACES } from '../../data/boardLayout';
import { getSpaceIcon } from '../Icons/GameIcons';
import type { Space } from '../../types/game';
import styles from './Board.module.css';

const GRID_SIZE = 7;
const SPACE_BG_COLORS: Record<Space['type'], string> = {
  payday: '#C8F6D8',
  opportunity: '#D4F0FF',
  market: '#FFF4C2',
  doodad: '#FFD4D4',
  charity: '#F0D4FF',
  baby: '#FFD9EC',
  settlement: '#E8E8E8',
};

const SPACE_BORDER_COLORS: Record<Space['type'], string> = {
  payday: '#77DD77',
  opportunity: '#8FD3FF',
  market: '#FFE66D',
  doodad: '#FF9AA2',
  charity: '#CBA4E9',
  baby: '#FFB7E6',
  settlement: '#B5B5B5',
};

function getSpaceGridPosition(spaceId: number): { row: number; col: number } {
  const gridNumber = spaceId + 1;
  if (gridNumber >= 1 && gridNumber <= 6) {
    return { row: gridNumber, col: 0 };
  } else if (gridNumber >= 7 && gridNumber <= 12) {
    return { row: 6, col: gridNumber - 6 };
  } else if (gridNumber >= 13 && gridNumber <= 17) {
    return { row: 18 - gridNumber, col: 6 };
  } else {
    return { row: 0, col: 24 - gridNumber };
  }
}

export function Board() {
  const { state } = useGame();
  const players = state.players;
  const currentPlayer = players[state.currentPlayerIndex];

  const grid: (Space | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );

  SPACES.forEach((space) => {
    const { row, col } = getSpaceGridPosition(space.id);
    grid[row][col] = space;
  });

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.boardTitle}>
        <span className={styles.titleIcon}>🎲</span>
        <span>财富大冒险</span>
      </div>
      <div className={styles.board}>
        {grid.map((row, rowIndex) =>
          row.map((space, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            if (!space) {
              return (
                <div key={key} className={styles.innerCell}>
                  <div className={styles.centerDecoration}>🏦</div>
                </div>
              );
            }

            const playersHere = players.filter((p) => !p.isBankrupt && p.position === space.id && !p.isInFastTrack);
            const isCurrentSpace = currentPlayer && !currentPlayer.isBankrupt && currentPlayer.position === space.id;

            return (
              <motion.div
                key={key}
                className={`${styles.space} ${isCurrentSpace ? styles.activeSpace : ''}`}
                style={{
                  backgroundColor: SPACE_BG_COLORS[space.type],
                  borderColor: SPACE_BORDER_COLORS[space.type],
                }}
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <div className={styles.spaceIcon}>{getSpaceIcon(space.type)}</div>
                <div className={styles.spaceName}>{space.name}</div>
                <div className={styles.spaceId}>{space.id + 1}</div>
                <div className={styles.pieces}>
                  {playersHere.map((p) => {
                    const isCurrentPiece = p.id === currentPlayer?.id;
                    return (
                      <motion.span
                        key={p.id}
                        className={styles.piece}
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                        animate={isCurrentPiece ? { y: [0, -6, 0], scale: [1, 1.2, 1.1] } : {}}
                        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'loop' }}
                      >
                        <span className={styles.pieceFace}>{isCurrentPiece ? '⭐' : ''}</span>
                      </motion.span>
                    );
                  })}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
