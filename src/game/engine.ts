import { v4 as uuidv4 } from 'uuid';
import { Card, GameState, Player, Rank, Suit, Action } from './types';

const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, id: uuidv4() });
        }
    }
    return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

export function createNewGame(roomId: string): GameState {
    return {
        roomId,
        players: [],
        phase: 'LOBBY',
        deck: [],
        trump: null,
        dealer: 0,
        turn: 0,
        upCard: null,
        maker: null,
        alone: null,
        currentTrick: { cards: [], leadSuit: null, winner: null },
        tricksTaken: [0, 0],
        scores: [0, 0],
        version: 0,
        lastActionTimestamp: Date.now(),
    };
}


// Helper: Get card value based on trump
function getCardValue(card: Card, trump: Suit | null, leadSuit: Suit | null): number {
    if (!trump) return RANKS.indexOf(card.rank);

    const isRight = card.suit === trump && card.rank === 'J';
    const isLeft = card.rank === 'J' && card.suit === getOppositeSuit(trump);

    if (isRight) return 100;
    if (isLeft) return 99;
    if (card.suit === trump) return 50 + RANKS.indexOf(card.rank);

    if (leadSuit && card.suit === leadSuit) return 20 + RANKS.indexOf(card.rank);

    return RANKS.indexOf(card.rank);
}

function getOppositeSuit(suit: Suit): Suit {
    switch (suit) {
        case 'H': return 'D';
        case 'D': return 'H';
        case 'C': return 'S';
        case 'S': return 'C';
    }
}

function getEffectiveSuit(card: Card, trump: Suit | null): Suit {
    if (!trump) return card.suit;
    if (card.rank === 'J' && card.suit === getOppositeSuit(trump)) return trump;
    return card.suit;
}

export function getLegalActions(state: GameState, playerId: string): Action[] {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return [];

    const player = state.players[playerIndex];
    const isTurn = state.turn === playerIndex;

    if (state.phase === 'LOBBY') {
        if (!player.isReady) return [{ type: 'READY', playerId }];
        if (state.players.length === 4 && state.players.every(p => p.isReady) && playerIndex === 0) {
            return [{ type: 'START_GAME', playerId }];
        }
        return [];
    }

    if (!isTurn) return [];

    if (state.phase === 'BIDDING_ROUND_1') {
        return [
            { type: 'ORDER_UP', playerId },
            { type: 'PASS', playerId }
        ];
    }

    if (state.phase === 'BIDDING_ROUND_2') {
        const actions: Action[] = [{ type: 'PASS', playerId }];
        // Stick the dealer rule: dealer cannot pass at end of round 2
        if (state.dealer === playerIndex) {
            actions.shift(); // Remove PASS
        }

        const invalidSuit = state.upCard?.suit;
        SUITS.forEach(suit => {
            if (suit !== invalidSuit) {
                actions.push({ type: 'CALL_TRUMP', playerId, payload: { suit } });
            }
        });
        return actions;
    }

    if (state.phase === 'PLAYING') {
        const leadSuit = state.currentTrick.leadSuit;
        const hand = player.hand;

        if (!leadSuit) {
            // Can lead any card
            return hand.map(card => ({ type: 'PLAY_CARD', playerId, payload: { card } }));
        }

        // Must follow suit if possible
        const effectiveLeadSuit = leadSuit; // Logic already handles left bower as trump
        const hasLeadSuit = hand.some(c => getEffectiveSuit(c, state.trump) === effectiveLeadSuit);

        if (hasLeadSuit) {
            return hand
                .filter(c => getEffectiveSuit(c, state.trump) === effectiveLeadSuit)
                .map(card => ({ type: 'PLAY_CARD', playerId, payload: { card } }));
        }

        // Can play any card if void in lead suit
        return hand.map(card => ({ type: 'PLAY_CARD', playerId, payload: { card } }));
    }

    return [];
}

export function applyAction(state: GameState, action: Action): GameState {
    const newState = JSON.parse(JSON.stringify(state));
    newState.version += 1;
    newState.lastActionTimestamp = Date.now();

    const playerIndex = newState.players.findIndex((p: Player) => p.id === action.playerId);
    if (playerIndex === -1) return state; // Invalid player

    switch (action.type) {
        case 'READY':
            newState.players[playerIndex].isReady = true;
            break;

        case 'START_GAME':
            if (newState.phase === 'LOBBY') {
                startRound(newState);
            }
            break;

        case 'PASS':
            newState.turn = (newState.turn + 1) % 4;
            if (newState.phase === 'BIDDING_ROUND_1') {
                if (newState.turn === newState.dealer) {
                    // Dealer passed, move to round 2
                    newState.phase = 'BIDDING_ROUND_2';
                    newState.turn = (newState.dealer + 1) % 4;
                } else if (newState.turn === (newState.dealer + 1) % 4) {
                    // Everyone passed round 1
                    newState.phase = 'BIDDING_ROUND_2';
                }
            } else if (newState.phase === 'BIDDING_ROUND_2') {
                if (newState.turn === (newState.dealer + 1) % 4) {
                    // Everyone passed round 2 (shouldn't happen with stick the dealer)
                    // Redeal? Or force dealer? For now, redeal.
                    startRound(newState);
                }
            }
            break;

        case 'ORDER_UP':
            newState.trump = newState.upCard!.suit;
            newState.maker = playerIndex;
            newState.phase = 'PLAYING'; // Technically dealer discards first, simplifying for now
            // Give up card to dealer
            const dealer = newState.players[newState.dealer];
            dealer.hand.push(newState.upCard!);
            // Dealer must discard (auto-discard lowest non-trump for MVP simplicity? Or add DISCARD phase?)
            // For MVP: Auto-discard lowest non-trump card
            discardLowest(dealer, newState.trump);

            newState.turn = (newState.dealer + 1) % 4;
            break;

        case 'CALL_TRUMP':
            newState.trump = action.payload.suit;
            newState.maker = playerIndex;
            newState.phase = 'PLAYING';
            newState.turn = (newState.dealer + 1) % 4;
            break;

        case 'PLAY_CARD':
            const card = action.payload.card;
            const player = newState.players[playerIndex];

            // Remove card from hand
            player.hand = player.hand.filter((c: Card) => c.id !== card.id);

            // Add to trick
            newState.currentTrick.cards.push({ playerId: action.playerId, card });

            if (!newState.currentTrick.leadSuit) {
                newState.currentTrick.leadSuit = getEffectiveSuit(card, newState.trump);
            }

            if (newState.currentTrick.cards.length === 4) {
                // Trick complete
                resolveTrick(newState);
            } else {
                newState.turn = (newState.turn + 1) % 4;
            }
            break;
    }

    return newState;
}

function startRound(state: GameState) {
    state.deck = shuffleDeck(createDeck());
    // Deal 5 cards to each
    state.players.forEach(p => {
        p.hand = state.deck.splice(0, 5);
    });
    state.upCard = state.deck.pop() || null;
    state.phase = 'BIDDING_ROUND_1';
    state.turn = (state.dealer + 1) % 4;
    state.trump = null;
    state.maker = null;
    state.currentTrick = { cards: [], leadSuit: null, winner: null };
    state.tricksTaken = [0, 0];
}

function discardLowest(player: Player, trump: Suit) {
    // Simple heuristic discard
    let lowestVal = 1000;
    let lowestIdx = -1;

    player.hand.forEach((c, i) => {
        const val = getCardValue(c, trump, null);
        if (val < lowestVal) {
            lowestVal = val;
            lowestIdx = i;
        }
    });

    if (lowestIdx !== -1) {
        player.hand.splice(lowestIdx, 1);
    }
}

function resolveTrick(state: GameState) {
    let highestVal = -1;
    let winnerIdx = -1;

    state.currentTrick.cards.forEach((play, i) => {
        const val = getCardValue(play.card, state.trump, state.currentTrick.leadSuit);
        if (val > highestVal) {
            highestVal = val;
            winnerIdx = i;
        }
    });

    const winnerPlayerId = state.currentTrick.cards[winnerIdx].playerId;
    const winnerPlayerIndex = state.players.findIndex(p => p.id === winnerPlayerId);
    const winnerTeam = state.players[winnerPlayerIndex].team;

    state.tricksTaken[winnerTeam]++;
    state.currentTrick.winner = winnerPlayerId;

    // Delay or immediate? For state, immediate. Frontend handles animation delay.
    // But we need to clear the trick for the next play.
    // Ideally, we keep the trick in state marked as 'complete' until the next action starts it?
    // Or we have a 'TRICK_COLLECTED' phase?
    // For simplicity: Clear it, but maybe store 'lastTrick' for UI?
    // Let's just reset for now, frontend might miss it if polling is slow.
    // Better: Keep it, set turn to winner, and next PLAY_CARD clears it?
    // Or add a 'COLLECT_TRICK' action?
    // Let's auto-clear after a check? 
    // Actually, let's leave it full. The next player (winner) must 'PLAY_CARD'.
    // But wait, if we leave it, how do we know it's new?
    // Let's add a 'TRICK_END' phase or just clear it when the winner plays next.

    // We'll clear it immediately for logic, but maybe we need a 'lastTrick' field for UI.
    // state.lastTrick = ...

    state.currentTrick = { cards: [], leadSuit: null, winner: null };
    state.turn = winnerPlayerIndex;

    if (state.tricksTaken[0] + state.tricksTaken[1] === 5) {
        scoreRound(state);
    }
}

function scoreRound(state: GameState) {
    const makerTeam = state.players[state.maker!].team;
    const defenderTeam = makerTeam === 0 ? 1 : 0;

    const makerTricks = state.tricksTaken[makerTeam];

    if (makerTricks === 5) {
        state.scores[makerTeam] += 2; // March
        // TODO: Check for 'alone' -> 4 points
    } else if (makerTricks >= 3) {
        state.scores[makerTeam] += 1;
    } else {
        state.scores[defenderTeam] += 2; // Euchred
    }

    if (state.scores[0] >= 10 || state.scores[1] >= 10) {
        state.phase = 'GAME_OVER';
    } else {
        // Next round
        state.dealer = (state.dealer + 1) % 4;
        startRound(state);
    }
}

export function getPublicView(state: GameState, playerId: string): GameState {
    const publicState = JSON.parse(JSON.stringify(state));

    // Hide other players' hands
    publicState.players.forEach((p: Player) => {
        if (p.id !== playerId) {
            p.hand = p.hand.map(() => ({ suit: '?', rank: '?', id: 'hidden' } as any));
        }
    });

    // Hide deck (though usually empty during play)
    publicState.deck = [];

    return publicState;
}
