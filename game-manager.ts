import { RoevhulGameState } from "./games/roevhul.ts";
import { WebSocketWithUsername } from "./types.ts";

export const INGOING_EVENT_TYPES = ["action", "manage"] as const;
export const OUTGOING_EVENT_TYPES = ["send-response", "state", "player-move"] as const;
export type IngoingEventType = (typeof INGOING_EVENT_TYPES)[number];
export type OutgoingEventType = (typeof OUTGOING_EVENT_TYPES)[number];

export const isIngoingEvent = (event: any): event is IngoingEventType => INGOING_EVENT_TYPES.includes(event);
export const isOutgoingEvent = (event: any): event is OutgoingEventType => OUTGOING_EVENT_TYPES.includes(event);

export interface IGameState {
  start(players: string[]): void;
  getCurrentPlayerTurn(): string;
  isGameOver(): boolean;

  tryMakeMove(username: string, move: unknown): { ok: boolean; message: string };
  getState(username: string): unknown;
}

export interface IGameManager<IGameState> {
  state: IGameState;
  started: boolean;
  connectedClients: Map<string, WebSocketWithUsername>;
  acceptedUsers: string[];
  start(): void;
  bindSocket(socket: WebSocketWithUsername): void;
  bindSocket(socket: WebSocketWithUsername, broadcastState: boolean): void;
  clientDisconnected(username: string): void;
}

export class GameManager implements IGameManager<IGameState> {
  connectedClients = new Map<string, WebSocketWithUsername>();
  acceptedUsers: string[] = [];
  started = false;

  constructor(public admin: string, public state: IGameState) {
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
    if (!isIngoingEvent(event)) {
      return; // not for me
    }

    switch (event) {
      case "action":
        this.handleActionEvent(username, rest);
        break;

      case "manage":
        if (username !== this.admin || !this.state.isGameOver()) {
          return; // only admins can manage the game and not during an active session
        }

        if (rest.newGame === true) {
          this.state.start(this.acceptedUsers);
          this.broadcastCurrentState();
        }

        break;
       
      default:
        console.log("Ignored; No handler for ingoing event", event, "with data", rest);
        break;
    }
  }

  private handleActionEvent(username: string, eventData: any): void {
    const response = this.state.tryMakeMove(username, eventData);
    console.log("->", response);

    const userState = this.state.getState(username) as RoevhulGameState;
    if (userState.hand.length === 0) {
      console.log("Player", username, "finished!");
    }

    if (response.ok) {
      this.broadcast(_ => this.createSocketMessage("player-move", { username, ...eventData }));
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
