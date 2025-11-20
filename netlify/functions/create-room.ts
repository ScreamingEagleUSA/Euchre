import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { createNewGame } from '../../src/game/engine';
import { rooms } from './store';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const roomId = uuidv4().slice(0, 8); // Short ID for easier sharing
    const gameState = createNewGame(roomId);

    rooms.set(roomId, gameState);

    return {
        statusCode: 200,
        body: JSON.stringify({ roomId }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Allow CORS for dev
        },
    };
};
