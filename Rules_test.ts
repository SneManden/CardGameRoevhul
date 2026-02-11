import { assertEquals } from "@std/assert";
import { Move, moveToString, Rules } from "./Rules.ts";
import { gameConfigDefaults } from "./game.ts";
import { Table } from "./Table.ts";
import { toShortString } from "./Card.ts";

function sut(): { rules: Rules, table: Table } {
  const table = new Table();
  return {
    table,
    rules: new Rules(table, gameConfigDefaults.magnitudeOrder),
  };
}

Deno.test({
  name: "Should always be able to pass",
  fn() {
    // Arrange
    const { table, rules } = sut();

    table.top = { rank: 2, suit: "hearts" };
    
    // Act
    const isValid = rules.isValidPlay("pass");

    // Assert
    assertEquals(isValid, true);
  }
});

// Game Must start with 3 of clubs
// ===============================
const error = `game must start with ${toShortString({ suit: "clubs", rank: 3 })}`;
const startCases: { move: Move, expected: ReturnType<Rules["isValidPlay"]> }[] = [
  // Invalid moves
  { move: "pass", expected: error },
  { move: "Joker", expected: error },
  { move: { rank: 4, suit: "clubs" }, expected: error },
  { move: { rank: 3, suit: "hearts" }, expected: error },
  // Valid moves
  { move: { rank: 3, suit: "clubs" }, expected: true },
  { move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }], expected: true },
];
for (const { move, expected } of startCases) {
  Deno.test({
    name: `Game must start with 3 of clubs: should return "${expected}" for move "${moveToString(move)}"`,
    fn() {
      // Arrange
      const { rules } = sut();
      
      // Act
      const isValid = rules.isValidPlay(move);

      // Assert
      assertEquals(isValid, expected);
    }
  });
}

// Invalid multi play moves
// ===============================
const multiPlayCases: { top: Table["top"], move: Move, expected: ReturnType<Rules["isValidPlay"]> }[] = [
  // Invalid move: cannot play multiple cards of different rank
  { top: null, move: [{ rank: 4, suit: "clubs" }, { rank: 3, suit: "hearts" }], expected: "cannot play multiple cards of different rank" },
  { top: null, move: [{ rank: 4, suit: "hearts" }, { rank: 3, suit: "hearts" }], expected: "cannot play multiple cards of different rank" },
  { top: null, move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }, { rank: 5, suit: "spades" }], expected: "cannot play multiple cards of different rank" },
  { top: null, move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }, { rank: 3, suit: "spades" }, { rank: 5, suit: "diamonds" }], expected: "cannot play multiple cards of different rank" },
  // Invalid move: cannot play multiple cards in single-card play
  // Invalid move: must play same number of cards in multi-card play
  // Invalid move: card has insufficient rank
  // Valid moves
  { top: null, move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }], expected: true },
  { top: null, move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }, { rank: 3, suit: "spades" }], expected: true },
  { top: null, move: [{ rank: 3, suit: "clubs" }, { rank: 3, suit: "hearts" }, { rank: 3, suit: "spades" }, { rank: 3, suit: "diamonds" }], expected: true },
];
for (const { top, move, expected } of multiPlayCases) {
  Deno.test({
    name: `Playing multiple cards must all be same rank: should return "${expected}" for move "${moveToString(move)}"`,
    fn() {
      // Arrange
      const { table, rules } = sut();
      table.pile = ["Joker"]; // Not first play
      table.top = top;
      
      // Act
      const isValid = rules.isValidPlay(move);

      // Assert
      assertEquals(isValid, expected);
    }
  });
}

