import { useGameStore } from '../state/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { Suit } from '../game/types';

export function HUD() {
    const { gameState, playerId } = useGameStore();
    const { performAction } = useGameLoop();

    if (!gameState || !playerId) return null;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    const isTurn = gameState.players[gameState.turn].id === playerId;
    const team0Score = gameState.scores[0];
    const team1Score = gameState.scores[1];
    const myTeam = player.team;
    const myScore = myTeam === 0 ? team0Score : team1Score;
    const oppScore = myTeam === 0 ? team1Score : team0Score;

    const getSuitIcon = (suit: Suit | null) => {
        if (!suit) return null;
        switch (suit) {
            case 'H': return <span className="text-red-500">♥</span>;
            case 'D': return <span className="text-red-500">♦</span>;
            case 'C': return <span className="text-black dark:text-white">♣</span>;
            case 'S': return <span className="text-black dark:text-white">♠</span>;
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
            {/* Top Bar: Scores & Trump */}
            <div className="flex justify-between items-start">
                <div className="bg-slate-900/80 p-4 rounded-lg text-white backdrop-blur-sm">
                    <div className="text-sm text-slate-400">SCORES</div>
                    <div className="flex gap-4 text-xl font-bold">
                        <div className="text-blue-400">US: {myScore}</div>
                        <div className="text-red-400">THEM: {oppScore}</div>
                    </div>
                </div>

                {gameState.trump && (
                    <div className="bg-slate-900/80 p-4 rounded-lg text-white backdrop-blur-sm flex flex-col items-center">
                        <div className="text-sm text-slate-400">TRUMP</div>
                        <div className="text-3xl">{getSuitIcon(gameState.trump)}</div>
                    </div>
                )}
            </div>

            {/* Center: Game Messages / Turn Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
                {isTurn && (
                    <div className="bg-yellow-500/90 text-black px-6 py-2 rounded-full font-bold animate-bounce shadow-lg">
                        YOUR TURN
                    </div>
                )}

                {gameState.phase === 'BIDDING_ROUND_1' && isTurn && (
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => performAction({ type: 'ORDER_UP', playerId })}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow-lg font-bold"
                        >
                            Order Up
                        </button>
                        <button
                            onClick={() => performAction({ type: 'PASS', playerId })}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded shadow-lg font-bold"
                        >
                            Pass
                        </button>
                    </div>
                )}

                {gameState.phase === 'BIDDING_ROUND_2' && isTurn && (
                    <div className="mt-4 flex flex-col gap-2 bg-slate-900/90 p-4 rounded-lg">
                        <div className="text-white mb-2">Call Trump</div>
                        <div className="flex gap-2">
                            {['H', 'D', 'C', 'S'].map((s) => (
                                s !== gameState.upCard?.suit && (
                                    <button
                                        key={s}
                                        onClick={() => performAction({ type: 'CALL_TRUMP', playerId, payload: { suit: s } })}
                                        className="bg-slate-700 hover:bg-slate-600 p-3 rounded text-2xl"
                                    >
                                        {getSuitIcon(s as Suit)}
                                    </button>
                                )
                            ))}
                        </div>
                        <button
                            onClick={() => performAction({ type: 'PASS', playerId })}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded shadow-lg font-bold mt-2"
                        >
                            Pass
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom: Hand (Placeholder for 2D fallback, but we are doing 3D) */}
            {/* We might want a 2D fallback or just debug info here if 3D fails */}
        </div>
    );
}
