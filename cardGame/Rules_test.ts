import { assertEquals } from "@std/assert";
import { MoveString, moveStringToMove, Rules } from "./Rules.ts";
import { gameConfigDefaults } from "./game.ts";
import { Table } from "./Table.ts";
import { fromRegularCardString, toShortString } from "./Card.ts";

function sut(): { rules: Rules, table: Table } {
  const table = new Table();
  return {
    table,
    rules: new Rules(table, gameConfigDefaults.magnitudeOrder),
  };
}


// Pass is always a valid move
// ===========================
Deno.test({
  name: "Should always be able to pass",
  fn() {
    // Arrange
    const { table, rules } = sut();
    table.top = fromRegularCardString("♥2");
    
    // Act
    const isValid = rules.isValidPlay("pass");

    // Assert
    assertEquals(isValid, true);
  }
});


// Game Must start with 3 of clubs
// ===============================
const error = `game must start with ${toShortString({ suit: "clubs", rank: 3 })}`;
const testfn1 = (moveString: MoveString, expected: ReturnType<Rules["isValidPlay"]>) => {
  // Arrange
  const { rules } = sut();
  
  // Act
  const isValid = rules.isValidPlay(moveStringToMove(moveString));

  // Assert
  assertEquals(isValid, expected);
};
Deno.test("Must start with '♣3' 1: should return error for move 'pass'", () => testfn1("pass", error));
Deno.test("Must start with '♣3' 2: should return error for move 'joker'", () => testfn1("✪", error));
Deno.test("Must start with '♣3' 3: should return error for move '♣4'", () => testfn1("♣4", error));
Deno.test("Must start with '♣3' 4: should return error for move '♥3'", () => testfn1("♥3", error));
Deno.test("Must start with '♣3' 5: should return true for move '♣3'", () => testfn1("♣3", true));
Deno.test("Must start with '♣3' 6: should return true for move '♣3 ♥3'", () => testfn1(["♣3", "♥3"], true));


// Multi play moves
// ================
const testfn2 = (top: Table["top"], moveString: MoveString, expected: ReturnType<Rules["isValidPlay"]>) => {
  // Arrange
  const { table, rules } = sut();
  table.pile = ["Joker"]; // Not first play
  table.top = top;
  
  // Act
  const isValid = rules.isValidPlay(moveStringToMove(moveString));

  // Assert
  assertEquals(isValid, expected);
}
// Invalid move: cannot play multiple cards of different rank
Deno.test("Multi card play 1: should return 'error' for move '♣4, ♥3'", () => testfn2(null, ["♣4", "♥3"], "cannot play multiple cards of different rank"));
Deno.test("Multi card play 2: should return 'error' for move '♥4, ♥3'", () => testfn2(null, ["♥4", "♥3"], "cannot play multiple cards of different rank"));
Deno.test("Multi card play 3: should return 'error' for move '♣3, ♥3, ♠5'", () => testfn2(null, ["♣3", "♥3", "♠5"], "cannot play multiple cards of different rank"));
Deno.test("Multi card play 4: should return 'error' for move '♣3, ♥3, ♠3, ♦5'", () => testfn2(null, ["♣3", "♥3", "♠3", "♦5"], "cannot play multiple cards of different rank"));
// Invalid move: cannot play multiple cards in single-card play
// Invalid move: must play same number of cards in multi-card play
// Invalid move: card has insufficient rank
// Valid moves
Deno.test("Multi card play 5: should return 'true' for move '♣3, ♥3'", () => testfn2(null, ["♣3", "♥3"], true));
Deno.test("Multi card play 6: should return 'true' for move '♣3, ♥3, ♠3'", () => testfn2(null, ["♣3", "♥3", "♠3"], true));
Deno.test("Multi card play 7: should return 'true' for move '♣3, ♥3, ♠3, ♦3'", () => testfn2(null, ["♣3", "♥3", "♠3", "♦3"], true));


