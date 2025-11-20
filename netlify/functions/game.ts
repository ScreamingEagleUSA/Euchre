import { Handler } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { createNewGame, applyAction, getPublicView } from '../../src/game/engine';
import { getBestAction } from '../../src/game/ai';
import { rooms } from './store';
import { Player } from '../../src/game/types';

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const action = event.queryStringParameters?.action;

    try {
        // --- CREATE ROOM ---
        if (action === 'create' && event.httpMethod === 'POST') {
            const roomId = uuidv4().slice(0, 8);
            const gameState = createNewGame(roomId);
            rooms.set(roomId, gameState);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ roomId }),
            };
        }

        // --- JOIN ROOM ---
        if (action === 'join' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { roomId, nickname } = body;

            if (!roomId || !nickname) return { statusCode: 400, headers, body: 'Missing roomId or nickname' };

            const room = rooms.get(roomId);
            if (!room) return { statusCode: 404, headers, body: 'Room not found' };
            if (room.players.length >= 4) return { statusCode: 403, headers, body: 'Room is full' };

            const playerId = uuidv4();
            const newPlayer: Player = {
                id: playerId,
                name: nickname,
                hand: [],
                team: room.players.length % 2 === 0 ? 0 : 1,
                seat: room.players.length as 0 | 1 | 2 | 3,
                isReady: false,
            };

            room.players.push(newPlayer);
            room.version += 1;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ playerId, roomState: room }),
            };
        }

        // --- GET ROOM STATE ---
        if (action === 'state' && event.httpMethod === 'GET') {
            const roomId = event.queryStringParameters?.roomId;
            const playerId = event.queryStringParameters?.playerId;
            const clientVersion = parseInt(event.queryStringParameters?.version || '0');

            if (!roomId || !playerId) return { statusCode: 400, headers, body: 'Missing params' };

            const room = rooms.get(roomId);
            if (!room) return { statusCode: 404, headers, body: 'Room not found' };

            if (room.version === clientVersion) {
                return { statusCode: 200, headers, body: JSON.stringify({ noChange: true }) };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(getPublicView(room, playerId)),
            };
        }

        // --- PERFORM ACTION ---
        if (action === 'perform' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { roomId, playerId, action: gameAction } = body;

            if (!roomId || !playerId || !gameAction) return { statusCode: 400, headers, body: 'Missing params' };

            const room = rooms.get(roomId);
            if (!room) return { statusCode: 404, headers, body: 'Room not found' };

            // Handle ADD_BOT special action
            if (gameAction.type === 'ADD_BOT') {
                if (room.players.length >= 4) return { statusCode: 400, headers, body: 'Room full' };
                const botId = `BOT-${uuidv4().slice(0, 4)}`;
                const botName = `Bot ${room.players.length + 1}`;
                const newBot: Player = {
                    id: botId,
                    name: botName,
                    hand: [],
                    team: room.players.length % 2 === 0 ? 0 : 1,
                    seat: room.players.length as 0 | 1 | 2 | 3,
                    isReady: true, // Bots are always ready
                };
                room.players.push(newBot);
                room.version += 1;
                return { statusCode: 200, headers, body: JSON.stringify(getPublicView(room, playerId)) };
            }

            // Apply player action
            try {
                applyAction(room, { ...gameAction, playerId });
                room.version += 1;
                room.lastActionTimestamp = Date.now();

                // AI Turn Loop
                let loopCount = 0;
                while (loopCount < 10) { // Safety break
                    const nextPlayerIndex = room.turn;
                    const nextPlayer = room.players[nextPlayerIndex];

                    if (nextPlayer && nextPlayer.id.startsWith('BOT-') && room.phase !== 'GAME_OVER' && room.phase !== 'LOBBY') {
                        const botAction = getBestAction(room, nextPlayer.id);
                        if (botAction) {
                            applyAction(room, botAction);
                            room.version += 1;
                        } else {
                            break; // Bot couldn't move
                        }
                    } else {
                        break; // Human turn or game over
                    }
                    loopCount++;
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(getPublicView(room, playerId)),
                };
            } catch (e: any) {
                return { statusCode: 400, headers, body: e.message || 'Invalid action' };
            }
        }

        return { statusCode: 400, headers, body: 'Invalid action or method' };

    } catch (error: any) {
        console.error('Game Error:', error);
        return { statusCode: 500, headers, body: error.message || 'Internal Server Error' };
    }
};
