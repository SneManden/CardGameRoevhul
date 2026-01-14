import { Card, isCard, isJoker, isRegular } from "./Card.ts";
import { Player } from "./Player.ts";
import { Move, Rules } from "./Rules.ts";
import { Table } from "./Table.ts";

export class CardPlayer extends Player {
  private hand: Card[] = [];
  private table: Table;
  private rules: Rules;

  private behavior: CardPlayerBehavior;

  constructor(table: Table, rules: Rules, behavior: CardPlayerBehavior, name?: string) {
    super(name);
    this.table = table;
    this.rules = rules;
    this.behavior = behavior;
  }

  play(): Move {
    const move = this.behavior.play(this.hand, this.table, this.rules);
    if (move !== "pass") {
      const playedCards = Array.isArray(move) ? [...move] : [move];
      this.hand = this.hand.filter(c => !playedCards.includes(c)); // Remove played cards from hand
    }

    return move;
  }

  hasStarterCard = (): boolean => this.hand.some(c => isCard(c, "clubs", 3));

  numCards = (): number => this.hand.length;

  reveal = (): Card[] => this.hand;

  receive(cards: Card | Card[]): void {
    if (Array.isArray(cards)) {
      this.hand.push(...cards);
    } else {
      this.hand.push(cards);
    }

    const order = (card: Card): number => isJoker(card) ? Number.POSITIVE_INFINITY : this.rules.magnitudeOrder[card.rank];

    this.hand = this.hand.toSorted((a,b) => order(a) - order(b));
  }

  override toString(): string {
    return `${this.name} [hand: ${this.hand.length}]`;
  }
}

export class ComputerDefault implements CardPlayerBehavior {
  play(hand: Card[], table: Table, rules: Rules): Move {
    const top = table.top;

    if (top === null) {
      const clubOf3 = hand.find(c => isCard(c, "clubs", 3));
      if (clubOf3) {
        return clubOf3;
      }
      
      return hand[0]; // TODO: better strategy: return the lowest rank card (non-clear if possible)
    }

    
    if (!Array.isArray(top)) {
      const better = hand.find(c => !isJoker(c) && c.rank !== 10 && rules.magnitudeOrder[c.rank] >= rules.magnitudeOrder[top.rank]); // TODO: align with rules
      if (better) {
        return better; // TODO: better strategy: return the lowest rank card better than top (non-clear if possible)
      }
    } else {
      const beatRank = top[0].rank;

      // TODO: better strategy: return the lowest rank cards better than top
      const multiRankCard = hand.filter(isRegular).find(
        c => c.rank !== 10 // TODO: align with rules
          && rules.magnitudeOrder[c.rank] >= rules.magnitudeOrder[beatRank]
          && hand.filter(hc => !isJoker(hc) && hc.rank === c.rank).length >= top.length);
      
      if (multiRankCard) {
        const allMultiRankCards = hand.filter(isRegular).filter(c => c.rank === multiRankCard.rank);
        const [a,b,c] = allMultiRankCards;
        switch (top.length) {
          case 2: return [a, b];
          case 3: return [a, b, c];
        }
      }
    }

    const clear = hand.find(c => isJoker(c) || c.rank === 10); // TODO: align with rules
    if (clear) {
      return clear;
    }

    return "pass";
  }
}

export interface CardPlayerBehavior {
  play(hand: Card[], table: Table, rules: Rules): Move;
}
