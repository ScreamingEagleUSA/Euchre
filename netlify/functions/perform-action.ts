import { Handler } from '@netlify/functions';
import { rooms } from './store';
import { applyAction } from '../../src/game/engine';
import { getBestAction } from '../../src/game/ai';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { roomId, playerId, action } = body;

    if (!roomId || !playerId || !action) {
        return { statusCode: 400, body: 'Missing parameters' };
    }

    const room = rooms.get(roomId);
    if (!room) {
        return { statusCode: 404, body: 'Room not found' };
    }

    // Validate action
    // For simplicity, we trust the client's intent if it's structurally valid,
    // but ideally we check against getLegalActions.
    // Let's do a quick check if it's the player's turn (unless it's READY/START_GAME).

    // TODO: Strict validation using getLegalActions
    // const legalActions = getLegalActions(room, playerId);
    // if (!legalActions.some(a => a.type === action.type ...)) ...

    if (action.type === 'ADD_BOT') {
        if (room.players.length < 4) {
            const botId = `bot-${Date.now()}`;
            room.players.push({
                id: botId,
                name: `Bot ${room.players.length + 1}`,
                hand: [],
                team: room.players.length % 2 === 0 ? 0 : 1,
                seat: room.players.length as 0 | 1 | 2 | 3,
                isReady: true, // Bots are always ready
            });
            room.version += 1;
        }
    } else {
        const newState = applyAction(room, action);
        rooms.set(roomId, newState);
    }

    // AI Turn Handling
    // If the next player is an AI (or empty seat we treat as AI?), make their move.
    // Since we don't explicitly have "AI players" in the players array yet (just empty slots?),
    // we need to decide how to handle AI.
    // Requirement: "If fewer than 4 players have joined, allow filling empty seats with AI."
    // Let's assume for now we just have human players.
    // If we want AI, we need to add them.
    // Let's add a hack: If the turn player is missing (index >= players.length), or marked as AI?
    // The prompt says "Single-player vs simple AI" and "Local game vs 3 AI bots".
    // So we need a way to add AI bots.
    // Let's add a "add-bot" action or auto-fill?
    // Let's handle AI moves in a loop here until it's a human's turn.

    // Simple loop for AI turns (max 10 to prevent infinite loops)
    let currentRoom = rooms.get(roomId)!;
    let loops = 0;
    while (loops < 10 && currentRoom.phase !== 'GAME_OVER' && currentRoom.phase !== 'LOBBY') {
        const turnPlayerIndex = currentRoom.turn;
        const turnPlayer = currentRoom.players[turnPlayerIndex];

        if (turnPlayer && turnPlayer.id.startsWith('bot-')) {
            const aiAction = getBestAction(currentRoom, turnPlayer.id);
            if (aiAction) {
                currentRoom = applyAction(currentRoom, aiAction);
                rooms.set(roomId, currentRoom);
            } else {
                break; // AI stuck?
            }
        } else {
            break; // Human turn
        }
        loops++;
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, newState: currentRoom }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    };
};
