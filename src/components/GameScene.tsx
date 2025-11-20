import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Table } from './Table';
import { Card } from './Card';
import { useGameStore } from '../state/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';


export function GameScene() {
    const { gameState, playerId } = useGameStore();
    const { performAction } = useGameLoop();

    if (!gameState || !playerId) return null;

    const myPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (myPlayerIndex === -1) return null;

    // Helper to get relative seat index (0 = me, 1 = left, 2 = top, 3 = right)
    const getRelativeSeat = (seatIndex: number) => {
        return (seatIndex - myPlayerIndex + 4) % 4;
    };

    // Positions for each seat
    const handPositions = [
        { pos: [0, 0, 4], rot: [-0.5, 0, 0] }, // Me (Bottom)
        { pos: [-6, 0, 0], rot: [0, -Math.PI / 2, 0] }, // Left
        { pos: [0, 0, -6], rot: [0, Math.PI, 0] }, // Top
        { pos: [6, 0, 0], rot: [0, Math.PI / 2, 0] }, // Right
    ];

    // Positions for played cards in the center
    const trickPositions = [
        [0, 0.1, 1],   // Me
        [-1.5, 0.1, 0], // Left
        [0, 0.1, -1],  // Top
        [1.5, 0.1, 0],  // Right
    ];

    return (
        <div className="absolute inset-0 z-0">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 8, 6]} fov={50} rotation={[-0.9, 0, 0]} />
                <color attach="background" args={['#1a1a1a']} />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={1} castShadow />

                <Table />

                {/* Render Players' Hands */}
                {gameState.players.map((player, index) => {
                    const relativeSeat = getRelativeSeat(index);
                    const { pos, rot } = handPositions[relativeSeat];

                    return (
                        <group key={player.id} position={pos as any} rotation={rot as any}>
                            {player.hand.map((card, cardIndex) => {
                                // Calculate fan spread
                                const spread = 0.5; // space between cards
                                const totalWidth = (player.hand.length - 1) * spread;
                                const xOffset = (cardIndex * spread) - (totalWidth / 2);

                                // Arc effect
                                const yOffset = -Math.abs(xOffset) * 0.2;
                                const rotOffset = -xOffset * 0.1;

                                return (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        position={[xOffset, yOffset, 0]}
                                        rotation={[0, 0, rotOffset]}
                                        isInteractive={relativeSeat === 0 && gameState.phase === 'PLAYING' && gameState.turn === index}
                                        onClick={() => {
                                            if (relativeSeat === 0 && gameState.phase === 'PLAYING' && gameState.turn === index) {
                                                performAction({ type: 'PLAY_CARD', playerId, payload: { card } });
                                            }
                                        }}
                                    />
                                );
                            })}
                        </group>
                    );
                })}

                {/* Render Current Trick */}
                {gameState.currentTrick.cards.map((play) => {
                    const playerIndex = gameState.players.findIndex(p => p.id === play.playerId);
                    const relativeSeat = getRelativeSeat(playerIndex);
                    const pos = trickPositions[relativeSeat];

                    // Add some random rotation for natural look
                    const randomRot = (play.card.rank.charCodeAt(0) % 10) * 0.05;

                    return (
                        <Card
                            key={`trick-${play.card.id}`}
                            card={play.card}
                            position={pos as any}
                            rotation={[-Math.PI / 2, 0, randomRot]} // Flat on table
                        />
                    );
                })}

                {/* Render Up Card (during bidding) */}
                {gameState.phase.startsWith('BIDDING') && gameState.upCard && (
                    <Card
                        card={gameState.upCard}
                        position={[0, 0.1, 0]} // Center of table
                        rotation={[-Math.PI / 2, 0, 0]}
                    />
                )}

                {/* <OrbitControls /> */}
            </Canvas>
        </div>
    );
}
