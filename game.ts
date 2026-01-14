import { Deck, Rank } from "./Card.ts";
import { Player } from "./Player.ts";

export type GameConfig = {
  numPlayers?: number,
  jokers?: number,
  clearCards?: (Rank | "Joker")[],
  magnitudeOrder?: { [R in Rank]: number },
};

export const gameConfigDefaults: Required<GameConfig> = {
  numPlayers: 4,
  jokers: 2,
  clearCards: [10, "Joker"],
  magnitudeOrder: {
    3: 1,
    4: 2,
    5: 3, 
    6: 4,
    7: 5,
    8: 6,
    9: 7,
    10: 8,
    "Jack": 9,
    "Queen": 10,
    "King": 11,
    "Ace": 12,
    2: 13,
  }
};

export class Game {
  private config: Required<GameConfig>;
  private pile: Deck;
  private players: Player[];
  
  constructor(config: GameConfig) {
    this.config = { ...gameConfigDefaults, ...config };
    
    this.players = [...Array(this.config.numPlayers).keys()].map(_ => new Player());
    this.pile = Deck.empty();

    const deck = Deck.create(this.config.jokers);
    for (let playerIndex=0; deck.size() > 0; playerIndex=(playerIndex+1)%this.config.numPlayers) {
      const card = deck.draw();
      if (card) {
        this.players[playerIndex].give(card);
      }
    }

    for (const player of this.players) {
      console.log(player);
    }
  }

  run(): void {
  }

}