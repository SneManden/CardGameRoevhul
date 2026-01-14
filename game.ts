import { Deck, Rank, toShortString, toString } from "./Card.ts";
import { CardPlayer, ComputerDefault } from "./CardPlayer.ts";
import { Move, Rules } from "./Rules.ts";
import { Table } from "./Table.ts";

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
    "Jack": 8,
    "Queen": 9,
    "King": 10,
    "Ace": 11,
    2: 12,
    10: Number.POSITIVE_INFINITY,
  }
};

export class Game {
  private config: Required<GameConfig>;
  private table = new Table();
  private players: CardPlayer[];

  private finished: CardPlayer[] = []; // first entry finished first, last entry finished last

  private rules: Rules;
  
  constructor(config: GameConfig) {
    this.config = { ...gameConfigDefaults, ...config };

    this.rules = new Rules(this.table, this.config.magnitudeOrder);
    
    this.players = [...Array(this.config.numPlayers).keys()].map(_ => new CardPlayer(this.table, this.rules, new ComputerDefault()));

    const deck = Deck.create(this.config.jokers);
    deck.shuffle();
    for (let playerIndex=0; deck.size() > 0; playerIndex=(playerIndex+1)%this.config.numPlayers) {
      const card = deck.draw();
      if (card) {
        this.players[playerIndex].receive(card);
      }
    }

    console.group("A new game of Røvhul is about to begin. Players are:");
    for (const player of this.players) {
      console.log(player.toString(), player.reveal().map(c => toShortString(c)));
    }
    console.groupEnd();
  }

  run(): void {
    let playerIndex = this.players.findIndex(player => player.hasStarterCard());

    let moveUnbeatenSince: string | undefined;

    const stopLevel = 2;

    while (!this.isDone()) {
      const player = this.players[playerIndex];
      
      stopLevel <= 1 && alert("Next");
      console.group("Player turn:", player.toString());

      // If everyone else passed, the table is cleared
      if (moveUnbeatenSince === player.name) {
        this.table.top = null;
        console.log(player.name, "unbeaten this round, table is cleared!");
        stopLevel <= 2 && alert("Next");
      }

      const tryAgain = (move: Move): boolean => move === "Joker" || (move !== "pass" && !Array.isArray(move) && move.rank === 10);

      let move: Move;
      do {
        move = player.play();
        console.log(player.name, "played", move);
        
        if (!this.rules.isValidPlay(move)) {
          throw new Error(`Invalid play by ${player.name}`);
        }
        this.updateTable(move);

        if (move !== "pass") {
          moveUnbeatenSince = player.name;
        }
      } while (tryAgain(move) && player.numCards() > 0);

      if (player.numCards() === 0) {
        this.finished.push(player);
        console.log(player.name, "finished! Only", this.players.length - this.finished.length, "left!");
        stopLevel <= 3 && alert("Next");
      }
      
      console.groupEnd();

      if (this.finished.length === this.players.length - 1) {
        console.log("Game ended.");
        break;
      }

      playerIndex = this.nextPlayerIndex(playerIndex);
    }
    
    console.log(this.finished);
  }

  private updateTable(move: Move): void {
    if (move === "pass") {
      return;
    }
    
    if (Array.isArray(move)) {
      this.table.pile.push(...move);
    } else {
      this.table.pile.push(move);
    }
    
    if ((Array.isArray(move) && move.length === 4) || move === "Joker") {
      this.table.top = null;
      return;
    }

    this.table.top = move;
  }

  private nextPlayerIndex(currentIndex: number): number {
    for (let i=1; i<=this.players.length; i++) {
      currentIndex = (currentIndex + i) % this.players.length;

      if (this.players[currentIndex].numCards() > 0) {
        return currentIndex;
      }
    }

    throw new Error("Failed to find next player to play card!");
  }

  private isDone(): boolean {
    return this.players.every(player => player.numCards() === 0);
  }
}

