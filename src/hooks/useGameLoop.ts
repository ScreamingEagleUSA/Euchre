import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { Action } from '../game/types';

const POLLING_INTERVAL = 1000;

export function useGameLoop() {
    const { roomId, playerId, gameState, setGameState, setError } = useGameStore();
    const versionRef = useRef(gameState?.version || 0);

    useEffect(() => {
        if (!roomId || !playerId) return;

        const fetchState = async () => {
            try {
                const res = await fetch(`/.netlify/functions/game?action=state&roomId=${roomId}&playerId=${playerId}&version=${gameState?.version || 0}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.noChange) {
                        setGameState(data);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        const interval = setInterval(fetchState, POLLING_INTERVAL);
        fetchState(); // Initial fetch

        return () => clearInterval(interval);
    }, [roomId, playerId, gameState?.version, setGameState]);

    const performAction = async (action: Action) => {
        if (!roomId || !playerId) return;
        try {
            const res = await fetch('/.netlify/functions/game?action=perform', {
                method: 'POST',
                body: JSON.stringify({ roomId, playerId, action }),
            });

            if (res.ok) {
                const newState = await res.json();
                setGameState(newState);
                versionRef.current = newState.version;
            } else {
                const err = await res.text();
                setError(err);
            }
        } catch (err) {
            console.error('Action error:', err);
            setError('Failed to perform action');
        }
    };

    return { performAction };
}
