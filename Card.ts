import { Utility } from "./Utility.ts";

export const ALL_SUITS = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
export type Suit = (typeof ALL_SUITS)[number];

const SUIT_ICON: { [S in Suit]: string } = {
  "clubs": "♣",
  "diamonds": "♦",
  "hearts": "♥",
  "spades": "♠"
};

export const ALL_RANKS = ["Ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "Jack", "Queen", "King"] as const;
export type Rank = (typeof ALL_RANKS)[number];

const RANK_SHORT: { [R in Rank]: string } = {
  "Ace": "A",
  "Jack": "J",
  "Queen": "Q",
  "King": "K",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10"
};

export type RegularCard = { suit: Suit; rank: Rank };

export type Card = RegularCard | "Joker";

export type ClearCard = "Joker" | (RegularCard & { rank: 10 });

export type RegularCardString = `${"♣"|"♦"|"♥"|"♠"}${"A"|2|3|4|5|6|7|8|9|10|"J"|"Q"|"K"}` | `✪`;
export type CardString = RegularCardString | `✪`;

export const toString = (card: Card): string => isJoker(card) ? card : `${card.rank} of ${card.suit}`;
export const toShortString = (card: Card): string => isJoker(card) ? "✪" : `${SUIT_ICON[card.suit]}${RANK_SHORT[card.rank]}`;

export const fromRegularCardString = (value: RegularCardString): RegularCard => {
  const [suitIcon, rankValue] = value.split("");

  const suit = Object.entries(SUIT_ICON).find(([_, icon]) => icon === suitIcon)?.[0];
  const rank = Object.entries(RANK_SHORT).find(([_, shortRank]) => shortRank === rankValue)?.[0];
  if (!suit || !rank) {
    throw new Error(`Failed to create card from string '${value}'`);
  }

  const realRank = (Number.isInteger(Number(rank)) ? Number(rank) : rank) as Rank; // A bit ugly, but shrug

  return { suit, rank: realRank };
}

export const fromCardString = (value: CardString): Card => {
  if (value === "✪") {
    return "Joker";
  }

  return fromRegularCardString(value);
}

export const isJoker = (card: Card): card is "Joker" => card === "Joker";
export const isRegular = (card: Card): card is RegularCard => !isJoker(card);
export const isCard = (card: Card, suit: Suit, rank: Rank): card is { suit: Suit, rank: Rank } => !isJoker(card) && card.suit === suit && card.rank === rank;
export const isClear = (card: Card): card is ClearCard => isJoker(card) || card.rank === 10;

export class Deck {
  private cards: Card[];

  private constructor(jokers: number, empty: boolean = false) {
    if (empty) {
      this.cards = [];
      return;
    }

    const cards: Card[] = [];
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        cards.push({ suit, rank });
      }
    }
    this.cards = cards.concat([...Array(jokers).keys()].map(_ => "Joker"));
  }

  static create(jokers: number = 0): Deck {
    return new Deck(jokers);
  }

  static empty(): Deck {
    return new Deck(0, true);
  }

  size(): number {
    return this.cards.length;
  }

  add(cards: Card | Card[]): void {
    if (Array.isArray(cards)) {
      this.cards.push(...cards);
    } else {
      this.cards.push(cards);
    }
  }

  draw(numCards: number = 1): Card | Card[] | null {
    if (numCards === 0) {
      return null;
    }

    if (numCards === 1) {
      return this.cards.pop() ?? null;
    } else {
      const drawn: Card[] = [];
      for (let i=0; i<numCards && this.cards.length>0; i++) {
        const card = this.cards.pop();
        if (card) {
          drawn.push(card);
        }
      }
      return drawn;
    }
  }

  shuffle(): void {
    Utility.shuffle(this.cards);
  }
}
