import { Rank, Card, RegularCard, isJoker } from "./Card.ts";
import { Table } from "./Table.ts";

export type Move = "pass" | Card | [RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard, RegularCard];

export class Rules {
  private table: Table;
  
  magnitudeOrder: {
    [R in Rank]: number;
  };

  constructor(table: Table, magnitudeOrder: {
    [R in Rank]: number;
  }) {
    this.table = table;
    this.magnitudeOrder = magnitudeOrder;
  }

  isValidPlay(cards: Move): true | string {
    if (cards === "pass") {
      return true; // You can always pass
    }
    
    const top = this.table.top;
    if (top === null) {
      return true; // You can play anything when the table is empty
    }

    if (Array.isArray(cards)) {
      if (!Array.isArray(top)) {
        return "cannot play multiple cards in single-card play";
      }

      if (cards.length !== top.length) {
        return "must play same number of cards in multi-card play";
      }

      if (!cards.every(c => c.rank === cards[0].rank)) {
        return "cannot play multiple cards of different rank";
      }

      if (this.magnitudeOrder[cards[0].rank] < this.magnitudeOrder[top[0].rank]) {
        return "card has insufficient rank";
      }

      return true;
    }

    if (isJoker(cards)) {
      return true; // Jokers can always be played, no exceptions
    }

    if (Array.isArray(top)) {
      return "cannot play a single card in multi-card play";
    }

    if (this.magnitudeOrder[cards.rank] < this.magnitudeOrder[top.rank]) {
      return "card has insufficient rank";
    }

    return true;
  }
}
