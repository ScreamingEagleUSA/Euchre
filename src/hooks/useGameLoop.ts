import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { Action } from '../game/types';

const POLLING_INTERVAL = 1000;

export function useGameLoop() {
    const { roomId, playerId, gameState, setGameState, setError } = useGameStore();
    const versionRef = useRef(gameState?.version || 0);

    useEffect(() => {
        if (!roomId || !playerId) return;

        const poll = async () => {
            try {
                const res = await fetch(`/.netlify/functions/room-state?roomId=${roomId}&playerId=${playerId}&clientVersion=${versionRef.current}`);
                if (!res.ok) throw new Error('Failed to fetch state');

                const data = await res.json();
                if (!data.noChange) {
                    setGameState(data);
                    versionRef.current = data.version;
                }
            } catch (err) {
                console.error('Polling error:', err);
                // Don't set global error on polling failure to avoid UI flicker, just retry
            }
        };

        const interval = setInterval(poll, POLLING_INTERVAL);
        poll(); // Initial call

        return () => clearInterval(interval);
    }, [roomId, playerId, setGameState]);

    const performAction = async (action: Action) => {
        if (!roomId || !playerId) return;

        try {
            // Optimistic update? Maybe too risky for complex game state.
            // Just send and wait for next poll or response.

            const res = await fetch('/.netlify/functions/perform-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, action }),
            });

            if (!res.ok) throw new Error('Action failed');

            const data = await res.json();
            if (data.newState) {
                setGameState(data.newState);
                versionRef.current = data.newState.version;
            }
        } catch (err) {
            console.error('Action error:', err);
            setError('Failed to perform action');
        }
    };

    return { performAction };
}
