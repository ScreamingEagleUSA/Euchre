import { useGameStore } from './state/gameStore';
import { Lobby } from './components/Lobby';
import { HUD } from './components/HUD';
import { GameScene } from './components/GameScene';

function App() {
    const { gameState } = useGameStore();

    return (
        <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
            {(!gameState || gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER') && (
                <Lobby />
            )}

            {gameState && gameState.phase !== 'LOBBY' && (
                <>
                    <HUD />
                    <GameScene />
                </>
            )}
        </div>
    );
}

export default App;
