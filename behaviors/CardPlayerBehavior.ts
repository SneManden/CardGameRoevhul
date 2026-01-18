import { Card } from "../Card.ts";
import { Rules, Move } from "../Rules.ts";
import { Table } from "../Table.ts";

export interface CardPlayerBehavior {
  play(hand: Card[], table: Table, rules: Rules): Move;
}
