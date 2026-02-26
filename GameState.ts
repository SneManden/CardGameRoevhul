import { WebSocketWithUsername } from "./types.ts";

export const INGOING_EVENT_TYPES = ["action"] as const;
export const OUTGOING_EVENT_TYPES = ["send-response", "state", "player-move"] as const;
export type IngoingEventType = (typeof INGOING_EVENT_TYPES)[number];
export type OutgoingEventType = (typeof OUTGOING_EVENT_TYPES)[number];

export interface IBar {
  start(players: string[]): void;
  getCurrentPlayerTurn(): string;
  isGameOver(): boolean;

  tryMakeMove(username: string, move: unknown): { ok: boolean; message: string };
  getState(username: string): unknown;
}

export interface IFoo<IBar> {
  state: IBar;
  started: boolean;
  connectedClients: Map<string, WebSocketWithUsername>;
  acceptedUsers: string[];
  start(): void;
  bindSocket(socket: WebSocketWithUsername): void;
  bindSocket(socket: WebSocketWithUsername, broadcastState: boolean): void;
  clientDisconnected(username: string): void;
}

export class Foo implements IFoo<IBar> {
  connectedClients = new Map<string, WebSocketWithUsername>();
  acceptedUsers: string[] = [];
  started = false;

  constructor(public state: IBar) {
    console.log("Initialized game (Foo)");
  }

  start(): void {
    // Override onmessage with own private variant, then default to original after 
    for (const socket of this.connectedClients.values()) {
      this.bindSocket(socket);
      this.acceptedUsers.push(socket.username);
    }

    console.log("Game started! (Foo)");

    this.state.start(this.acceptedUsers);
    this.started = true;

    // Cannot broadcast during setup WS
    setTimeout(() => this.broadcastCurrentState(), 500);
  }

  bindSocket(socket: WebSocketWithUsername, broadcastState = false): void {
    const onMessageFn = socket.onmessage;
    socket.onmessage = (event) => {
      this.onMessage(socket.username, event.data);
      if (onMessageFn) {
        onMessageFn.bind(socket)(event);
      }
    }

    if (broadcastState) {
      setTimeout(() => this.broadcastCurrentState(), 500);
    }
  }

  clientDisconnected(username: string): void {
    this.connectedClients.delete(username);
  }

  // Receive message from a client
  private onMessage(username: string, eventData: any): void {
    const { event, ...rest } = JSON.parse(eventData);
    if (!INGOING_EVENT_TYPES.includes(event)) {
      return; // not for me
    }

    const response = this.state.tryMakeMove(username, rest);
    console.log("->", response);

    if (response.ok) {
      this.broadcast(_ => this.createSocketMessage("player-move", { username, ...rest }));
      this.broadcastCurrentState();
    } else {
      this.connectedClients.get(username)?.send(this.createSocketMessage("send-response", { message: response.message }));
    }
  }

  private broadcastCurrentState(): void {
    this.broadcast(username => this.createSocketMessage("state", { state: this.state.getState(username) }));
  }

  private broadcast(fn: (username: string) => string): void {
    for (const [username, socket] of this.connectedClients.entries()) {
      socket.send(fn(username));
    }
  }

  private createSocketMessage(eventType: OutgoingEventType, payload: any): string {
    return JSON.stringify({ event: eventType, ...payload });
  }
}
