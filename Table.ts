import { Card, RegularCard } from "./Card.ts";

export class Table {
  public top: RegularCard | [RegularCard, RegularCard] | [RegularCard, RegularCard, RegularCard] | null = null; // null = empty. Can also be null during game after a "clear card" has been used.
  public pile: Card[] = [];
}
