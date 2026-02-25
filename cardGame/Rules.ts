import { Rank, Card, RegularCard, ClearCard, isClear, toShortString, isCard, CardString, RegularCardString, fromCardString, fromRegularCardString, fromCid } from "./Card.ts";
import { Table } from "./Table.ts";

export type Move = "pass" | Card | [RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard, RegularCard];

export type MoveString = "pass" | CardString | [RegularCardString, RegularCardString] | [RegularCardString, RegularCardString, RegularCardString] | [RegularCardString, RegularCardString, RegularCardString, RegularCardString];

export const isClearMove = (move: Move): move is ClearCard => !Array.isArray(move) && move !== "pass" && isClear(move);

export const moveToString = (move: Move): string => Array.isArray(move)
  ? move.map(toShortString).join(", ")
  : move === "pass"
  ? move
  : toShortString(move);

export const moveStringToMove = (value: MoveString): Move => {
  if (Array.isArray(value)) {
    const [a, b, c, d] = value;
    switch (value.length) {
      case 2: return [fromRegularCardString(a), fromRegularCardString(b)];
      case 3: return [fromRegularCardString(a), fromRegularCardString(b), fromRegularCardString(c!)];
      case 4: return [fromRegularCardString(a), fromRegularCardString(b), fromRegularCardString(c!), fromRegularCardString(d!)];
    }
  } else {
    if (value === "pass") {
      return "pass";
    } else {
      return fromCardString(value);
    }
  }
}

export const cidStringToMove = (value: "pass" | string[]): Move => {
  if (value === "pass") {
    return value;
  }

  const [a, b, c, d] = value;
  switch (value.length) {
    case 1: return fromCid(a);
    case 2: return [fromCid(a) as RegularCard, fromCid(b) as RegularCard];
    case 3: return [fromCid(a) as RegularCard, fromCid(b) as RegularCard, fromCid(c) as RegularCard];
    case 4: return [fromCid(a) as RegularCard, fromCid(b) as RegularCard, fromCid(c) as RegularCard, fromCid(d) as RegularCard];
    default: throw new Error(`Failed to convert cid string to move: ${value}!`);
  }
}

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
        return Array.isArray(move)
          ? this.isValidMultiPlayMove(move)
          : true; // After first card is played, anything can be played when the table is empty
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
