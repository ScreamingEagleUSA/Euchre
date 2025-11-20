import { Handler } from '@netlify/functions';
import { rooms } from './store';
import { getPublicView } from '../../src/game/engine';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { roomId, playerId, clientVersion } = event.queryStringParameters || {};

    if (!roomId) {
        return { statusCode: 400, body: 'Missing roomId' };
    }

    const room = rooms.get(roomId);
    if (!room) {
        return { statusCode: 404, body: 'Room not found' };
    }

    // Long polling optimization:
    // If clientVersion matches current version, we could wait a bit?
    // Netlify functions have a timeout (10s default).
    // For MVP, just return "no change" immediately if versions match.

    if (clientVersion && parseInt(clientVersion) === room.version) {
        return {
            statusCode: 200,
            body: JSON.stringify({ noChange: true }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        };
    }

    const publicState = playerId ? getPublicView(room, playerId) : room;

    return {
        statusCode: 200,
        body: JSON.stringify(publicState),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    };
};
