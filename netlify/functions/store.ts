import { GameState } from '../../src/game/types';

// Use globalThis to persist across function invocations in the same container
const globalAny = globalThis as any;

if (!globalAny.__rooms) {
    globalAny.__rooms = new Map<string, GameState>();
}

export const rooms: Map<string, GameState> = globalAny.__rooms;
