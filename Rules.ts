import { Rank, Card, RegularCard, ClearCard, isClear, toShortString } from "./Card.ts";
import { Table } from "./Table.ts";

export type Move = "pass" | Card | [RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard, RegularCard];

export const isClearMove = (move: Move): move is ClearCard => !Array.isArray(move) && move !== "pass" && isClear(move);

export const moveToString = (move: Move): string => Array.isArray(move)
  ? move.map(toShortString).join(", ")
  : move === "pass"
  ? move
  : toShortString(move);

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

  isValidPlay(move: Move): true | string {
    if (move === "pass") {
      return true; // You can always pass
    }
    
    const top = this.table.top;
    if (top === null) {
      // Game must start with 3 of clubs
      // if (this.table.pile.length === 0) {
      //   if ()
      // }
      
      return true; // You can play anything when the table is empty
    }

    if (Array.isArray(move)) {
      if (!Array.isArray(top)) {
        return "cannot play multiple cards in single-card play";
      }

      if (move.length !== top.length) {
        return "must play same number of cards in multi-card play";
      }

      if (move.some(c => c.rank !== move[0].rank)) {
        return "cannot play multiple cards of different rank";
      }

      if (this.magnitudeOrder[move[0].rank] < this.magnitudeOrder[top[0].rank]) {
        return "card has insufficient rank";
      }

      return true;
    }

    if (isClearMove(move)) {
      return true; // Jokers or 10's can always be played, no exceptions
    }

    if (Array.isArray(top)) {
      return "cannot play a single card in multi-card play";
    }

    if (this.magnitudeOrder[move.rank] < this.magnitudeOrder[top.rank]) {
      return "card has insufficient rank";
    }

    return true;
  }
}
