import { useState, useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { Copy, User, Users } from 'lucide-react';

export function Lobby() {
    const { roomId, playerId, gameState, setRoomId, setPlayerId, setGameState, setError } = useGameStore();
    const { performAction } = useGameLoop();
    const [nickname, setNickname] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');

    useEffect(() => {
        // Check URL for room ID
        const hash = window.location.hash;
        if (hash.startsWith('#room=')) {
            setJoinRoomId(hash.replace('#room=', ''));
        }
    }, []);

    const createRoom = async () => {
        try {
            const res = await fetch('/.netlify/functions/create-room', { method: 'POST' });
            const data = await res.json();
            setRoomId(data.roomId);
            window.location.hash = `room=${data.roomId}`;
        } catch (err) {
            setError('Failed to create room');
        }
    };

    const joinRoom = async () => {
        if (!nickname) return;
        const targetRoomId = roomId || joinRoomId;
        if (!targetRoomId) return;

        try {
            const res = await fetch('/.netlify/functions/join-room', {
                method: 'POST',
                body: JSON.stringify({ roomId: targetRoomId, nickname }),
            });

            if (!res.ok) {
                const err = await res.text();
                setError(err);
                return;
            }

            const data = await res.json();
            setPlayerId(data.playerId);
            setGameState(data.roomState);
            setRoomId(targetRoomId);
        } catch (err) {
            setError('Failed to join room');
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/#room=${roomId}`;
        navigator.clipboard.writeText(url);
        alert('Link copied!');
    };

    if (gameState) {
        return (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white p-8">
                <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
                    <h2 className="text-3xl font-bold mb-6 text-center">Lobby</h2>

                    <div className="mb-6">
                        <div className="flex items-center justify-between bg-slate-700 p-3 rounded mb-2">
                            <span className="font-mono text-lg">Room: {roomId}</span>
                            <button onClick={copyLink} className="p-2 hover:bg-slate-600 rounded">
                                <Copy size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 text-center">Share this link to invite friends</p>
                    </div>

                    <div className="space-y-3 mb-8">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <Users size={20} /> Players ({gameState.players.length}/4)
                        </h3>
                        {gameState.players.map((p) => (
                            <div key={p.id} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                                <div className="flex items-center gap-2">
                                    <User size={18} />
                                    <span>{p.name} {p.id === playerId ? '(You)' : ''}</span>
                                </div>
                                {p.isReady ? (
                                    <span className="text-green-400 text-sm font-bold">READY</span>
                                ) : (
                                    <span className="text-slate-500 text-sm">WAITING</span>
                                )}
                            </div>
                        ))}
                        {/* Empty slots */}
                        {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="flex items-center justify-between bg-slate-700/50 p-3 rounded border-2 border-dashed border-slate-600">
                                <span className="text-slate-500 italic">Empty Seat</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {!gameState.players.find(p => p.id === playerId)?.isReady && (
                            <button
                                onClick={() => performAction({ type: 'READY', playerId: playerId! })}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
                            >
                                I'm Ready
                            </button>
                        )}

                        {gameState.players.length < 4 && (
                            <button
                                onClick={() => performAction({ type: 'ADD_BOT', playerId: playerId! })}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition text-sm"
                            >
                                Add Bot
                            </button>
                        )}

                        {gameState.players.length === 4 && gameState.players.every(p => p.isReady) && gameState.players[0].id === playerId && (
                            <button
                                onClick={() => performAction({ type: 'START_GAME', playerId: playerId! })}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded transition animate-pulse"
                            >
                                Start Game
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-white">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                <h1 className="text-4xl font-bold mb-2 text-blue-400">CensEuchre</h1>
                <p className="text-slate-400 mb-8">3D Multiplayer Euchre</p>

                {!roomId && !joinRoomId ? (
                    <div className="space-y-4">
                        <button
                            onClick={createRoom}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
                        >
                            Create Private Table
                        </button>
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div>
                            <div className="relative flex justify-center"><span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span></div>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 outline-none"
                            onChange={(e) => setJoinRoomId(e.target.value)}
                        />
                        <button
                            onClick={() => setJoinRoomId(joinRoomId)} // Just triggers re-render to show join UI
                            disabled={!joinRoomId}
                            className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded transition disabled:opacity-50"
                        >
                            Join Room
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xl">Joining Room: <span className="font-mono text-blue-300">{roomId || joinRoomId}</span></h3>
                        <input
                            type="text"
                            placeholder="Enter your nickname"
                            className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:border-blue-500 outline-none"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                        <button
                            onClick={joinRoom}
                            disabled={!nickname}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
                        >
                            Join Table
                        </button>
                        <button
                            onClick={() => { setRoomId(''); setJoinRoomId(''); window.location.hash = ''; }}
                            className="text-slate-400 hover:text-white text-sm underline"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
