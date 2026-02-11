import { Card, toShortString, isRegular, isClear } from "../Card.ts";
import { Rules, Move } from "../Rules.ts";
import { Table } from "../Table.ts";
import { CardPlayerBehavior } from "./CardPlayerBehavior.ts";

export class PlayerInteractive implements CardPlayerBehavior {
  play(hand: Card[], table: Table, rules: Rules): Move {
    let move: Move;

    while (true) {
      move = this.askMove(hand);

      if (rules.isValidPlay(move)) {
        break;
      } else {
        console.log(" -> Invalid move! Try again.");
      }
    }

    return move;
  }

  private askMove(hand: Card[]): Move {
    let move: Move;

    console.group("Hand:", hand.map((c, i) => `${toShortString(c)} (${i})`));

    while (true) {
      const cmd = prompt(`  Please enter command ([p]:pass, [0-${hand.length - 1}]:card(s) to play separated with space)`)?.toLowerCase() ?? null;
      if (!cmd) {
        continue;
      }

      if (cmd.trim() === "p" || cmd.trim() === "pass") {
        move = "pass";
        break;
      }

      if (cmd.split(" ").some(x => Number.isNaN(Number(x)))) {
        console.log(" -> Invalid command! Try again.");
        continue;
      }

      const cardIndexes = cmd.split(" ").map(x => x.trim()).map(Number);
      if (cardIndexes.length > 4) {
        console.log(" -> At most 4 cards can be played at a time! Try again.");
        continue;
      }

      const invalidIndex = cardIndexes.find(ci => !hand[ci]);
      if (invalidIndex !== undefined) {
        console.log(" -> Invalid card number", invalidIndex, "! Try again.");
        continue;
      }

      const cards = cardIndexes.map(ci => hand[ci]);
      if (cards.length === 1) {
        move = cards[0];
        break;
      }

      const regularCards = cards.filter(isRegular).filter(c => !isClear(c));

      if (regularCards.length !== cards.length) {
        console.log(" -> Only a single clear card (Joker/10) can be played at a time! Try again.");
        continue;
      }

      const [c1, c2, c3, c4] = regularCards;
      switch (regularCards.length) {
        case 2:
          return [c1, c2];
        case 3:
          return [c1, c2, c3];
        case 4:
          return [c1, c2, c3, c4];
      }

      console.log(" -> At most 4 cards can be played at a time! Try again.");
    }

    console.groupEnd();

    return move;
  }
}
