export type Suit = 'H' | 'D' | 'C' | 'S';
export type Rank = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
    id: string; // Unique ID for React keys and tracking
}

export type PlayerId = string;

export interface Player {
    id: PlayerId;
    name: string;
    hand: Card[];
    team: 0 | 1; // 0: Host & Partner, 1: Opponents
    seat: 0 | 1 | 2 | 3; // 0 is bottom (host), clockwise
    isReady: boolean;
}

export type GamePhase =
    | 'LOBBY'
    | 'BIDDING_ROUND_1' // Order up
    | 'BIDDING_ROUND_2' // Call trump
    | 'PLAYING'
    | 'SCORING'
    | 'GAME_OVER';

export interface Trick {
    cards: { playerId: PlayerId; card: Card }[];
    leadSuit: Suit | null;
    winner: PlayerId | null;
}

export interface GameState {
    roomId: string;
    players: Player[];
    phase: GamePhase;

    // Game logic state
    deck: Card[];
    trump: Suit | null;
    dealer: number; // Seat index 0-3
    turn: number; // Seat index 0-3

    // Bidding state
    upCard: Card | null;
    maker: number | null; // Who called trump
    alone: number | null; // Who is going alone

    // Trick state
    currentTrick: Trick;
    tricksTaken: [number, number]; // Team 0, Team 1

    // Score
    scores: [number, number]; // Team 0, Team 1

    // Meta
    version: number; // Monotonic version for polling
    lastActionTimestamp: number;
}

export type ActionType =
    | 'JOIN'
    | 'READY'
    | 'START_GAME'
    | 'ORDER_UP'
    | 'PASS'
    | 'CALL_TRUMP'
    | 'PLAY_CARD'
    | 'ADD_BOT';

export interface Action {
    type: ActionType;
    playerId: PlayerId;
    payload?: any;
}
