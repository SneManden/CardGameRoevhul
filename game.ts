import { Deck, Rank, toShortString } from "./Card.ts";
import { CardPlayer } from "./CardPlayer.ts";
import { ComputerDefault, PlayerInteractive } from "./behaviors/ComputerDefault.ts";
import { isClearMove, Move, moveToString, Rules } from "./Rules.ts";
import { Table } from "./Table.ts";
import { Utility } from "./Utility.ts";

export type GameConfig = {
  numPlayers?: number,
  totalPlayers?: number,
  jokers?: number,
  magnitudeOrder?: { [R in Rank]: number },
};

export const gameConfigDefaults: Required<GameConfig> = {
  numPlayers: 1,
  totalPlayers: 5,
  jokers: 2,
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
  
  constructor(config?: GameConfig) {
    this.config = { ...gameConfigDefaults, ...config };

    this.rules = new Rules(this.table, this.config.magnitudeOrder);
    
    this.players = [
      ...[...Array(this.config.totalPlayers - this.config.numPlayers).keys()].map(_ => new CardPlayer(this.table, this.rules, new ComputerDefault())),
      ...[...Array(this.config.numPlayers).keys()].map(i => new CardPlayer(this.table, this.rules, new PlayerInteractive(), `Player ${i+1}`)),
    ];
    Utility.shuffle(this.players);

    const deck = Deck.create(this.config.jokers);
    deck.shuffle();
    for (let playerIndex=0; deck.size() > 0; playerIndex=(playerIndex+1)%this.players.length) {
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

  playGame(): void {
    let playerIndex = this.players.findIndex(player => player.hasStarterCard());

    const stopLevel = 0;

    const lastMoveBy = this.players.reduce<{ [player: string]: Move | null }>((result, player) => {
      result[player.name] = null;
      return result;
    }, {});

    let passed = 0;

    while (!this.isDone()) {
      const player = this.players[playerIndex];
      playerIndex = (playerIndex + 1) % this.players.length;

      if (player.numCards() === 0) {
        continue;
      }
      
      stopLevel <= 1 && alert("Next");
      console.group("Player turn:", player.toString());

      console.log("Top of table:", this.table.top ? moveToString(this.table.top) : "empty");

      const previousMoveByPlayer = lastMoveBy[player.name];
      // console.log("Previous move by", player.name, ":", previousMoveByPlayer ? moveToString(previousMoveByPlayer) : "N/A");

      // If everyone else passed, the table is cleared
      if (this.table.top && this.table.top === previousMoveByPlayer) {
        this.table.top = null;
        console.log(player.name, "unbeaten this round, table is cleared!");
        stopLevel <= 2 && alert("Next");
      } else if (Object.values(lastMoveBy).every(move => move === "pass")) {
        this.table.top = null;
        console.log("Everyone has passed, table is cleared!");
      }

      if (passed > this.players.length - this.finished.length) {
        alert("BUG?");
      }

      const tryAgain = (move: Move): boolean => move === "Joker" || (move !== "pass" && !Array.isArray(move) && move.rank === 10);

      let move: Move;
      do {
        move = player.play();
        lastMoveBy[player.name] = move;
        console.log(player.name, "played", moveToString(move));

        if (move === "pass") {
          passed += 1;
        } else {
          passed = 0;
        }
        
        if (!this.rules.isValidPlay(move)) {
          throw new Error(`Invalid play by ${player.name}`);
        }
        
        this.updateTable(move);
      } while (tryAgain(move) && player.numCards() > 0);

      if (player.numCards() === 0) {
        this.finished.push(player);
        delete lastMoveBy[player.name];
        if (this.players.length - this.finished.length > 1) {
          console.log(player.name, "finished! Only", this.players.length - this.finished.length, "left!");
        }
        stopLevel <= 3 && alert("Next");
      }
      
      console.groupEnd();

      if (this.finished.length === this.players.length - 1) {
        this.finished.push(this.players[playerIndex]);
        console.log("Game ended.");
        break;
      }
    }

    console.log("Standings:");
    console.table(this.finished.map((p,i) => ({ position: i+1, player: p.name, roevhul: i===this.finished.length-1 ? "X":null })), ["position", "player"]);
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
    
    if ((Array.isArray(move) && move.length === 4) || isClearMove(move)) {
      this.table.top = null;
      return;
    }

    this.table.top = move;
  }

  private isDone(): boolean {
    return this.players.every(player => player.numCards() === 0);
  }
}

