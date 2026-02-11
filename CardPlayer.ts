import { Card, isCard, isClear } from "./Card.ts";
import { CardPlayerBehavior } from "./behaviors/CardPlayerBehavior.ts";
import { Player } from "./Player.ts";
import { Move, Rules } from "./Rules.ts";
import { Table } from "./Table.ts";
import { PlayerInteractive } from "./behaviors/PlayerInteractive.ts";

export class CardPlayer extends Player {
  private hand: Card[] = [];
  private table: Table;
  private rules: Rules;

  private behavior: CardPlayerBehavior;

  constructor(table: Table, rules: Rules, behavior: CardPlayerBehavior, name?: string) {
    const promptName = behavior instanceof PlayerInteractive;
    super(name, promptName);
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

    const order = (card: Card): number => isClear(card) ? Number.POSITIVE_INFINITY : this.rules.magnitudeOrder[card.rank];

    this.hand = this.hand.toSorted((a,b) => order(a) - order(b));
  }

  override toString(): string {
    return `${this.name} [hand: ${this.hand.length}]`;
  }
}
