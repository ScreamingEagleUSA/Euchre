import { describe, it, expect } from 'vitest';
import { createNewGame, applyAction } from './engine';

describe('Game Engine', () => {
    it('should initialize a new game', () => {
        const state = createNewGame('test-room');
        expect(state.roomId).toBe('test-room');
        expect(state.phase).toBe('LOBBY');
        expect(state.players).toHaveLength(0);
    });

    it('should handle player joining and starting game', () => {
        let state = createNewGame('test-room');

        // Mock adding players (normally done via join-room function, but we can simulate state)
        for (let i = 0; i < 4; i++) {
            state.players.push({
                id: `p${i}`,
                name: `Player ${i}`,
                hand: [],
                team: i % 2 === 0 ? 0 : 1,
                seat: i as any,
                isReady: true
            });
        }

        const action = { type: 'START_GAME', playerId: 'p0' };
        state = applyAction(state, action as any);

        expect(state.phase).toBe('BIDDING_ROUND_1');
        expect(state.deck.length).toBe(3); // 24 - 20 dealt - 1 upcard
        expect(state.players[0].hand).toHaveLength(5);
        expect(state.upCard).toBeDefined();
    });

    it('should handle bidding', () => {
        let state = createNewGame('test-room');
        // Setup players
        for (let i = 0; i < 4; i++) {
            state.players.push({
                id: `p${i}`,
                name: `Player ${i}`,
                hand: [],
                team: i % 2 === 0 ? 0 : 1,
                seat: i as any,
                isReady: true
            });
        }
        state = applyAction(state, { type: 'START_GAME', playerId: 'p0' } as any);

        // p1 is dealer + 1 (turn)
        const turnPlayerId = state.players[state.turn].id;

        // Pass
        state = applyAction(state, { type: 'PASS', playerId: turnPlayerId } as any);
        expect(state.turn).toBe((state.dealer + 2) % 4);

        // Order Up
        const nextPlayerId = state.players[state.turn].id;
        const upCardSuit = state.upCard!.suit;
        state = applyAction(state, { type: 'ORDER_UP', playerId: nextPlayerId } as any);

        expect(state.phase).toBe('PLAYING');
        expect(state.trump).toBe(upCardSuit);
        expect(state.maker).toBe(state.players.findIndex(p => p.id === nextPlayerId));
        // Dealer should have picked up card and discarded (hand size 5)
        expect(state.players[state.dealer].hand).toHaveLength(5);
    });
});
