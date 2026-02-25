import { Card, Deck, isCard, toCid, toShortString } from "../cardGame/Card.ts";
import { gameConfigDefaults } from "../cardGame/game.ts";
import { cidStringToMove, Move, moveToString, Rules } from "../cardGame/Rules.ts";
import { Table } from "../cardGame/Table.ts";
import { IBar } from "../GameState.ts";

// server -> client
export type RoevhulGameState = {
  id: number;
  isGameOver: boolean;
  hand: string[];
  top: string[] | null;
  playerTurn: string;
  playerHandCount: { [username: string]: number };
};

// server -> client
export type PlayerActionEvent = {
  username: string;
  move: "pass" | string[];
}

// client -> server
export type PlayerMoveEvent = {
  id: number;
  move: "pass" | string[];
};


export class Roevhul implements IBar {
  private deck: Deck = Deck.create(0);
  private hands = new Map<string, Card[]>();
  private players: string[] = [];
  private turn = 0;
  private table = new Table();
  private rules: Rules;

  constructor() {
    this.rules = new Rules(this.table, gameConfigDefaults.magnitudeOrder);
  }
  
  start(players: string[]): void {
    this.players = [...players];
    this.deck.shuffle();
    this.dealHands();

    this.turn = this.players.indexOf(this.startingPlayer());

    console.log("A game of roevhul has started", {
      players: this.players,
      hands: this.hands,
      turn: this.turn,
      playerTurn: this.getCurrentPlayerTurn(),
    });
  }

  getCurrentPlayerTurn(): string {
    return this.players[this.turn % this.players.length];
  }

  tryMakeMove(username: string, moveEvent: PlayerMoveEvent): ReturnType<IBar["tryMakeMove"]> {
    const { move: moveValue } = moveEvent; // TODO: parse to real move

    console.log("tryMakeMove(username:", username, ", move:", moveValue, ")");

    const err = (message: string, ...logs: any[]): ReturnType<IBar["tryMakeMove"]> => {
      console.log(message, ...logs);
      return { ok: false, message };
    }

    if (this.getCurrentPlayerTurn() !== username) {
      return err("Ignored, it is not your turn!");
    }

    let move;
    try {
      move = cidStringToMove(moveValue);
    } catch (error) {
      return err("move event does not contain a valid move notation", error);
    }

    const hand = this.hands.get(username);
    if (!hand) {
      return err("internal error", "-> no such hand for username", username); // TODO: throw?
    }

    if (!this.rules.isValidPlay(move)) {
      return err("not a valid move");
    }

    if (move !== "pass") {
      const handCards = hand.map(card => toShortString(card));
      const moveCards = Array.isArray(move) ? move : [move];
      if (moveCards.some(card => !handCards.includes(toShortString(card)))) {
        return err("sneaky bastard tried to make a move with a card not in hand");
      }
  
      // The move is valid, make it!
      this.table.updateTable(move);

      // Remove cards from players hand
      for (const card of moveCards) {
        const indexOf = hand.findIndex(c => toShortString(c) === toShortString(card));
        console.log("removed", hand.splice(indexOf, 1), "card from hand");
      }
    }

    console.log("Move accepted, table updated! Top of table is now:", this.table.top ? moveToString(this.table.top) : "empty");

    // Next players turn
    const mayTryAgain = (move: Move): boolean => move === "Joker" || (move !== "pass" && !Array.isArray(move) && move.rank === 10);
    if (!mayTryAgain(move)) {
      console.log("next players turn");
      this.turn = this.getNextPlayerTurn();
      console.log("is determined to be:", this.turn, this.players[this.turn % this.players.length]);
    } else {
      console.log("user may try again, turn not ended.");
    }

    return { ok: true, message: "OK" };
  }

  getState(username: string): RoevhulGameState {
    const hand = this.hands.get(username);
    if (!hand) {
      throw new Error(`Failed to find hand for player with username '${username}'`);
    }

    return {
      id: this.turn,
      hand: hand.map(card => toCid(card)),
      isGameOver: this.isGameOver(),
      playerTurn: this.getCurrentPlayerTurn(),
      top: this.table.top === null
        ? null
        : (Array.isArray(this.table.top) ? this.table.top : [this.table.top]).map(card => toCid(card)),
      playerHandCount: this.hands.entries()
        .reduce<RoevhulGameState["playerHandCount"]>((result, [username, hand]) => {
          result[username] = hand.length;
          return result;
        }, {}),
    };
  }

  isGameOver(): boolean {
    const stillPlaying = this.stillPlaying();
    return stillPlaying.length < 2;
  }

  private getNextPlayerTurn(): number {
    console.group("getNextPlayerTurn() turn is currently", this.turn, this.players[this.turn % this.players.length]);
    let turn = this.turn;
    for (let i=0; i<this.players.length+1; i++) {
      turn += 1;

      const username = this.players[turn % this.players.length];
      const playerNumberOfCards = this.hands.get(username)?.length;
      if (!playerNumberOfCards) {
        console.log(this.players[turn % this.players.length], "number of cards is", playerNumberOfCards, "... not valid for next turn, skipped.");
        continue;
      }

      console.groupEnd();
      return turn;
    }

    console.groupEnd();
    throw new Error("Failed to determine next players turn!");
  }

  private stillPlaying(): string[] {
    return this.hands.entries()
      .map(([username, hand]) => ({ username, hand }))
      .filter(({ hand }) => hand.length > 0)
      .map(({ username }) => username)
      .toArray();
  }

  private startingPlayer(): string {
    const username = this.hands.entries()
      .map(([username, hand]) => ({ username, hand }))
      .find(({ hand }) => hand.some(c => isCard(c, "clubs", 3)))
      ?.username;

    if (!username) {
      throw new Error("Failed to find starting player!");
    }
    
    return username;
  }

  private dealHands(): void {
    for (let playerIndex=0; this.deck.size() > 0; playerIndex=(playerIndex+1)%this.players.length) {
      const username = this.players[playerIndex];
      const card = this.deck.draw(1);
      let hand = this.hands.get(username);
      if (!hand) {
        hand = [];
        this.hands.set(username, hand);
      }
      
      if (card) {
        hand.push(...(Array.isArray(card) ? card : [card]));
      }
    }
  }
}
