import * as bcrypt from "bcrypt/mod";
import { salt } from "./auth.ts";
import { IBar } from "./GameState.ts";
import { GameType, GameConfig, User } from "./types.ts";
import { Roevhul } from "./games/roevhul.ts";

export const gameTypeToStateMap: { [T in GameType]: () => IBar } = {
  "Roevhul": () => new Roevhul(),
};

export const games = new Map<string, GameConfig>();

export const users = new Map<string, User>();
users.set("SneManden", { passwordHash: await bcrypt.hash("test", salt), created: new Date() }); // Test user
users.set("Other", { passwordHash: await bcrypt.hash("test", salt), created: new Date() }); // Test user
