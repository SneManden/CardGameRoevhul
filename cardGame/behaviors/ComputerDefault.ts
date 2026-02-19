import { CardPlayerBehavior } from "./CardPlayerBehavior.ts";
import { Card, isCard, isClear, isRegular, isJoker } from "../Card.ts";
import { Rules, Move } from "../Rules.ts";
import { Table } from "../Table.ts";

export class ComputerDefault implements CardPlayerBehavior {
  play(hand: Card[], table: Table, rules: Rules): Move {
    const top = table.top;

    if (top === null) {
      const clubOf3 = hand.find(c => isCard(c, "clubs", 3));
      if (clubOf3) {
        return clubOf3;
      }

      return hand[0];
    }

    if (!Array.isArray(top)) {
      const better = hand.find(c => !isClear(c) && rules.magnitudeOrder[c.rank] >= rules.magnitudeOrder[top.rank]);
      if (better) {
        return better;
      }
    } else {
      const beatRank = top[0].rank;

      const multiRankCard = hand.filter(isRegular).filter(c => !isClear(c)).find(
        c => rules.magnitudeOrder[c.rank] >= rules.magnitudeOrder[beatRank]
          && hand.filter(hc => !isJoker(hc) && hc.rank === c.rank).length >= top.length);

      if (multiRankCard) {
        const allMultiRankCards = hand.filter(isRegular).filter(c => c.rank === multiRankCard.rank);
        const [a, b, c] = allMultiRankCards;
        switch (top.length) {
          case 2: return [a, b];
          case 3: return [a, b, c];
        }
      }
    }

    const clear = hand.find(isClear);
    if (clear) {
      return clear;
    }

    return "pass";
  }
}
