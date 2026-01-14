export class Player {
  private static usedPlayerNames: (typeof PLAYER_NAMES)[] = [];

  public name: string;

  constructor(name?: string) {
    this.name = name || Player.newName();
  }

  toString(): string {
    return `${this.name}`;
  }

  private static newName(): string {
    const available = PLAYER_NAMES.filter(name => !(name in Player.usedPlayerNames));

    if (available.length === 0) {
      throw new Error("Max number of players reached! Cannot assign default name to player");
    }

    return available[Math.floor(Math.random() * available.length)];
  }
}

export const PLAYER_NAMES = [
  "Amy Stake",
  "Barb Dwyer",
  "Chris P Bacon",
  "Chris P Baker",
  "Doug Graves",
  "Ella Vader",
  "Emma Roids",
  "Jed I Knight",
  "Lee King",
  "Ophelia Pane",
  "Paige Turner",
  "Philipa Bucket",
  "Rhoda Wolff",
  "Robyn Banks",
  "Sue Flay",
  "Sum Ting Wong",
  "Teresa Brown",
  "Teresa Crowd",
  "Teresa Green",
  "Tim Burr",
  "Toby Lerone",
  "Ty Prater",
  "Zoltan Pepper",
] as const;
