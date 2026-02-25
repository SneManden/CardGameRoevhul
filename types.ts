export type WebSocketWithUsername = WebSocket & { username: string };

export type GameType = "Roevhul"; // | "Davoserjazz" | "Fisk" | "Krig" ...

export type GameConfig = {
  title: string;
  type: GameType;
  numPlayers: number;
  admin: string;
  password: string | null;
  started: boolean;
  created: Date;
};

export type User = {
  passwordHash: string;
  created: Date;
};

export type GamesPlayed = {
  title: string;
  type: GameType;
  started: Date;
  ended: Date;
  admin: string;
  players: string[];
  stats: GameStats;
};

export type GameStats = {
  rounds: {
    standings: string[];
  }[];
};