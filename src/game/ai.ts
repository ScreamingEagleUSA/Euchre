import { GameState, Action, Card, Suit, Rank } from './types';
import { getLegalActions } from './engine';

const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export function getBestAction(state: GameState, playerId: string): Action | null {
    const legalActions = getLegalActions(state, playerId);
    if (legalActions.length === 0) return null;

    // If only one action, take it (e.g., forced play)
    if (legalActions.length === 1) return legalActions[0];

    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    // Bidding Logic
    if (state.phase === 'BIDDING_ROUND_1') {
        // Order up if we have 3+ trumps or 2 trumps + 1 off-suit Ace
        // Simple heuristic: Count potential trumps
        const potentialTrump = state.upCard!.suit;
        const trumpCount = countTrumps(player.hand, potentialTrump);

        if (trumpCount >= 3) {
            return legalActions.find(a => a.type === 'ORDER_UP') || legalActions[0];
        }
        return legalActions.find(a => a.type === 'PASS') || legalActions[0];
    }

    if (state.phase === 'BIDDING_ROUND_2') {
        // Find best suit to call
        let bestSuit: Suit | null = null;
        let maxTrumps = 0;

        SUITS.forEach(suit => {
            if (suit === state.upCard?.suit) return;
            const count = countTrumps(player.hand, suit);
            if (count > maxTrumps) {
                maxTrumps = count;
                bestSuit = suit;
            }
        });

        if (maxTrumps >= 3 && bestSuit) {
            const action = legalActions.find(a => a.type === 'CALL_TRUMP' && a.payload.suit === bestSuit);
            if (action) return action;
        }

        return legalActions.find(a => a.type === 'PASS') || legalActions[0];
    }

    // Playing Logic
    if (state.phase === 'PLAYING') {
        // Simple: Play highest legal card if leading or trying to win, lowest if losing
        // For MVP: Random valid move is better than crashing, but let's try to win

        // If leading
        if (!state.currentTrick.leadSuit) {
            // Play highest trump if we have it, else highest non-trump
            // Actually, leading trumps is good if we made it.
            // Let's just play the highest value card we have for now.
            return getHighestValueAction(legalActions, state.trump!, null);
        }

        // If following
        // Try to beat the current winner
        // If we can't beat, play lowest
        // const winningCard = getWinningCard(state.currentTrick.cards, state.trump!, state.currentTrick.leadSuit);
        // TODO: Check if we can beat winningCard. 
        // For now, just play highest card to be safe/aggressive.
        return getHighestValueAction(legalActions, state.trump!, state.currentTrick.leadSuit);
    }

    return legalActions[0];
}

function countTrumps(hand: Card[], trump: Suit): number {
    return hand.filter(c => {
        if (c.suit === trump) return true;
        if (c.rank === 'J' && c.suit === getOppositeSuit(trump)) return true;
        return false;
    }).length;
}

function getOppositeSuit(suit: Suit): Suit {
    switch (suit) {
        case 'H': return 'D';
        case 'D': return 'H';
        case 'C': return 'S';
        case 'S': return 'C';
    }
}

function getHighestValueAction(actions: Action[], trump: Suit, leadSuit: Suit | null): Action {
    // Sort actions by card value
    return actions.sort((a, b) => {
        const valA = getCardValue(a.payload.card, trump, leadSuit);
        const valB = getCardValue(b.payload.card, trump, leadSuit);
        return valB - valA;
    })[0];
}

// Duplicate from engine.ts (should export, but keeping self-contained for now to avoid circular deps if not careful)
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

// function getWinningCard(cards: {card: Card}[], trump: Suit, leadSuit: Suit): Card | null {
//   if (cards.length === 0) return null;
//   let bestCard = cards[0].card;
//   let bestVal = getCardValue(bestCard, trump, leadSuit);
  
//   for (let i = 1; i < cards.length; i++) {
//     const val = getCardValue(cards[i].card, trump, leadSuit);
//     if (val > bestVal) {
//       bestVal = val;
//       bestCard = cards[i].card;
//     }
//   }
//   return bestCard;
// }
