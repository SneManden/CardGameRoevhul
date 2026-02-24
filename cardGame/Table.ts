import { Card, RegularCard } from "./Card.ts";
import { isClearMove, Move } from "./Rules.ts";

export class Table {
  public top: RegularCard | [RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard] | null = null; // null = empty. Can also be null during game after a "clear card" has been used.
  public pile: Card[] = [];

  updateTable(move: Move): void {
    if (move === "pass") {
      return;
    }
    
    if (Array.isArray(move)) {
      this.pile.push(...move);
    } else {
      this.pile.push(move);
    }
    
    if ((Array.isArray(move) && move.length === 4) || isClearMove(move)) {
      this.top = null;
      return;
    }

    this.top = move;
  }
}
