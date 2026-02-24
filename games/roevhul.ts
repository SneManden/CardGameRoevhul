import { Card, Deck, isCard, RegularCard, toShortString } from "../cardGame/Card.ts";
import { gameConfigDefaults } from "../cardGame/game.ts";
import { Move, moveToString, Rules } from "../cardGame/Rules.ts";
import { Table } from "../cardGame/Table.ts";
import { IBar } from "../GameState.ts";

// server -> client
export type RoevhulGameState = {
  id: number;
  isGameOver: boolean;
  hand: Card[]; // TODO: convert to cid?
  top: Table["top"];
  playerTurn: string;
};

// server -> client
export type PlayerActionEvent = {
  username: string;
  move: Move;
}

// client -> server
export type PlayerMoveEvent = {
  id: number;
  move: Move;
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
  }

  getCurrentPlayerTurn(): string {
    return this.players[this.turn & this.players.length];
  }

  tryMakeMove(username: string, moveEvent: PlayerMoveEvent): void {
    const move: Move = moveEvent.move; // TODO: parse to real move

    console.log("tryMakeMove(username:", username, ", move:", moveToString(move), ")");

    const hand = this.hands.get(username)?.map(card => toShortString(card));
    if (!hand) {
      console.log("-> no such hand for username", username);
      return; // throw?
    }

    if (!this.rules.isValidPlay(move)) {
      console.log("-> not valid move");
      return; // not a valid move
    }

    if (move !== "pass") {
      const moveCards = Array.isArray(move) ? move : [move];
      if (moveCards.some(card => !hand.includes(toShortString(card)))) {
      console.log("-> sneaky bastard tried to make a move with a card not in hand! Hand is:", hand);
        return; // sneaky bastard tried to make a move with a card not in hand!
      }
  
      // The move is valid, make it!
      this.table.updateTable(move);

      // Remove cards from players hand
      for (const card of moveCards) {
        const indexOf = hand.indexOf(toShortString(card));
        hand.splice(indexOf, 1);
      }
    }

    console.log("Move accepted, table updated! Top of table is now:", this.table.top ? moveToString(this.table.top) : "empty");

    // Next players turn
    const mayTryAgain = (move: Move): boolean => move === "Joker" || (move !== "pass" && !Array.isArray(move) && move.rank === 10);
    if (!mayTryAgain(move)) {
      this.turn = this.getNextPlayerTurn();
    }
  }

  getState(username: string): RoevhulGameState {
    const hand = this.hands.get(username);
    if (!hand) {
      throw new Error(`Failed to find hand for player with username '${username}'`);
    }

    return {
      id: this.turn,
      hand: hand,
      isGameOver: this.isGameOver(),
      playerTurn: this.getCurrentPlayerTurn(),
      top: this.table.top,
    }
  }

  private getNextPlayerTurn(): number {
    let turn = this.turn;
    for (let i=0; i<this.players.length+1; i++) {
      turn += 1;

      const username = this.players[turn % this.players.length];
      const playerNumberOfCards = this.hands.get(username)?.length
      if (!playerNumberOfCards) {
        continue;
      }

      return turn;
    }

    throw new Error("Failed to determine next players turn!");
  }

  private isGameOver(): boolean {
    const stillPlaying = this.stillPlaying();
    return stillPlaying.length < 2;
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
      const hand = this.hands.get(username);
      if (card && hand) {
        hand.push(...(Array.isArray(card) ? card : [card]));
      }
    }
  }
}
