import { WebSocketWithUsername } from "./types.ts";

export interface IBar {
  start(players: string[]): void;
  getCurrentPlayerTurn(): string;
  isGameOver(): boolean;

  tryMakeMove(username: string, move: unknown): { ok: boolean; message: string };
  getState(username: string): unknown;
}

export interface IFoo<IBar> {
  state: IBar;
  connectedClients: Map<string, WebSocketWithUsername>;
  acceptedUsers: string[];
  start(): void;
  clientDisconnected(username: string): void;
}

export class Foo implements IFoo<IBar> {
  connectedClients = new Map<string, WebSocketWithUsername>();
  acceptedUsers: string[] = [];

  constructor(public state: IBar) {
    console.log("Initialized game (Foo)");
  }

  start(): void {
    // Override onmessage with own private variant, then default to original after 
    for (const socket of this.connectedClients.values()) {
      const onMessageFn = socket.onmessage;
      socket.onmessage = (event) => {
        this.onMessage(socket.username, event.data);
        if (onMessageFn) {
          onMessageFn.bind(socket)(event);
        }
      }

      this.acceptedUsers.push(socket.username);
    }

    console.log("Game started! (Foo)");

    this.state.start(this.acceptedUsers);

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

    const response = this.state.tryMakeMove(username, rest);
    console.log("->", response);
    if (response.ok) {
      this.broadcastCurrentState();
    } else {
      this.connectedClients.get(username)?.send(JSON.stringify({ event: "send-response", message: response.message }));
    }
  }

  private broadcastCurrentState(): void {
    console.group("broadcastCurrentState");
    for (const [username, socket] of this.connectedClients.entries()) {
      const state = this.state.getState(username);

      console.log(username, state);
      
      socket.send(JSON.stringify({ event: "state", state }));
    }
    console.groupEnd();
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
