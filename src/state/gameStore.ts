import { create } from 'zustand';
import { GameState, PlayerId } from '../game/types';

interface GameStore {
    roomId: string | null;
    playerId: PlayerId | null;
    gameState: GameState | null;
    error: string | null;

    setRoomId: (roomId: string) => void;
    setPlayerId: (playerId: PlayerId) => void;
    setGameState: (gameState: GameState) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
    roomId: null,
    playerId: null,
    gameState: null,
    error: null,

    setRoomId: (roomId) => set({ roomId }),
    setPlayerId: (playerId) => set({ playerId }),
    setGameState: (gameState) => set({ gameState }),
    setError: (error) => set({ error }),
    reset: () => set({ roomId: null, playerId: null, gameState: null, error: null }),
}));
