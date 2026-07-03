import { GameProvider } from './context/GameContext';
import { useGame } from './context/GameContext';
import { StartScreen } from './components/StartScreen/StartScreen';
import { GameScreen } from './components/GameScreen/GameScreen';
import './App.css';

function AppContent() {
  const { state } = useGame();

  if (state.phase === 'SETUP') {
    return <StartScreen />;
  }

  return <GameScreen />;
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
