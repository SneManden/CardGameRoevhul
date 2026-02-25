import { WebSocketWithUsername } from "./types.ts";

export interface IBar {
  start(players: string[]): void;
  getCurrentPlayerTurn(): string;
  isGameOver(): boolean;

  tryMakeMove(username: string, move: unknown): void;
  getState(username: string): unknown;
}

export interface IFoo<IBar> {
  state: IBar;
  connectedClients: Map<string, WebSocketWithUsername>;
  start(): void;
  clientDisconnected(username: string): void;
}

export class Foo implements IFoo<IBar> {
  connectedClients = new Map<string, WebSocketWithUsername>();

  constructor(public state: IBar) {
    console.log("Initialized game (Foo)");
  }

  start(): void {
    const players: string[] = [];
    
    // Override onmessage with own private variant, then default to original after 
    for (const socket of this.connectedClients.values()) {
      const onMessageFn = socket.onmessage;
      socket.onmessage = (event) => {
        this.onMessage(socket.username, event.data);
        if (onMessageFn) {
          onMessageFn.bind(socket)(event);
        }
      }

      players.push(socket.username);
    }

    console.log("Game started! (Foo)");

    this.state.start(players);

    // Cannot broadcast during setup WS
    setTimeout(() => this.broadcastCurrentState(), 500);
  }

  clientDisconnected(username: string): void {
    this.connectedClients.delete(username);
  }

  // Receive message from a client
  private onMessage(username: string, eventData: any): void {
    console.log("Foo: onMessage(username:", username, ", event:", eventData, ")");

    const { event, ...rest } = JSON.parse(eventData);
    if (event !== "action") {
      return; // not for me
    }

    if (this.state.getCurrentPlayerTurn() !== username) {
      return; // ignore messages from players whose turn it is not
    }

    this.state.tryMakeMove(username, rest);
    this.broadcastCurrentState();
  }

  private broadcastCurrentState(): void {
    for (const [username, socket] of this.connectedClients.entries()) {
      const state = this.state.getState(username);
      socket.send(JSON.stringify({ event: "state", state }));
    }
  }
}

// export interface IGameRunner {
//   gameLoop(): Promise<void> | void;
// }

// interface IGameState<TPlayer> {
//   getCurrentPlayer(): TPlayer;
// }

// interface IGameRules {

// }

// export class RoevhulGameRunner implements IGameRunner {
  
//   constructor(private state: IGameState<string>, private rules: IGameRules) {
//   }
  
//   gameLoop(): void {
//     const player = this.state.getCurrentPlayer();

//     if ()
//   }
// }
