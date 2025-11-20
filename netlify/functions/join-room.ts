import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { rooms } from './store';
import { Player } from '../../src/game/types';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { roomId, nickname } = body;

    if (!roomId || !nickname) {
        return { statusCode: 400, body: 'Missing roomId or nickname' };
    }

    const room = rooms.get(roomId);
    if (!room) {
        return { statusCode: 404, body: 'Room not found' };
    }

    if (room.players.length >= 4) {
        // Check if player is reconnecting? For now, just reject.
        // Or maybe we can support reconnect if we had a session token.
        // MVP: Reject if full.
        return { statusCode: 403, body: 'Room is full' };
    }

    const playerId = uuidv4();
    const newPlayer: Player = {
        id: playerId,
        name: nickname,
        hand: [],
        team: room.players.length % 2 === 0 ? 0 : 1, // 0, 1, 0, 1
        seat: room.players.length as 0 | 1 | 2 | 3,
        isReady: false,
    };

    room.players.push(newPlayer);
    room.version += 1;

    return {
        statusCode: 200,
        body: JSON.stringify({ playerId, roomState: room }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    };
};
