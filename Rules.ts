import { Rank, Card, RegularCard, ClearCard, isClear, toShortString, isCard } from "./Card.ts";
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
    const top = this.table.top;
    if (top === null) {
      // Game must start with 3 of clubs
      if (this.table.pile.length === 0) {
        const moveContains3OfClubs = Array.isArray(move)
          ? move.some(c => isCard(c, "clubs", 3))
          : move !== "pass" && isCard(move, "clubs", 3);
        if (!moveContains3OfClubs) {
          return `game must start with ${toShortString({ suit: "clubs", rank: 3 })}`;
        }

        return Array.isArray(move) ? this.isValidMultiPlayMove(move) : true;
      } else {
        return true; // After first card is played, anything can be played when the table is empty
      }
    }
    
    if (move === "pass") {
      return true; // You can always pass
    }

    if (Array.isArray(move)) {
      return this.isValidMultiPlayMove(move);
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

  private isValidMultiPlayMove(move: Exclude<Move, Card | "pass">): true | string {
    if (move.some(c => c.rank !== move[0].rank)) {
      return "cannot play multiple cards of different rank";
    }

    const top = this.table.top;
    if (!top) {
      return true;
    }

    if (!Array.isArray(top)) {
      return "cannot play multiple cards in single-card play";
    }

    if (move.length !== top.length) {
      return "must play same number of cards in multi-card play";
    }

    if (this.magnitudeOrder[move[0].rank] < this.magnitudeOrder[top[0].rank]) {
      return "card has insufficient rank";
    }

    return true;
  }
}
