import assert from "node:assert/strict";
import {
  detectDelimiter,
  parseCsv,
  toCsv,
  toTsv,
} from "../src/csv.js";

const quoted = parseCsv('name,note\n"Ada","hello, world"\nGrace,"line one\nline two"');
assert.equal(quoted.stats.rowCount, 3);
assert.equal(quoted.stats.columnCount, 2);
assert.equal(quoted.rows[1][1], "hello, world");
assert.equal(quoted.rows[2][1], "line one\nline two");

const semicolon = parseCsv("name;city\nMina;Zurich\nJon;Milan", {
  delimiter: "auto",
});
assert.equal(detectDelimiter("name;city\nMina;Zurich\nJon;Milan"), ";");
assert.equal(semicolon.delimiter, ";");
assert.equal(semicolon.rows[2][1], "Milan");

const uneven = parseCsv("a,b,c\n1,2\n3,4,5,6");
assert.equal(uneven.warnings.length, 1);
assert.equal(uneven.stats.emptyCellCount, 3);

const trimmed = parseCsv(" a , b \n 1 , 2 ", { trimCells: true });
assert.deepEqual(trimmed.rows, [
  ["a", "b"],
  ["1", "2"],
]);

const unclosed = parseCsv('a,b\n"one,two');
assert.equal(unclosed.errors[0], "A quoted field is not closed.");

assert.equal(toCsv([["a,b", 'quote "x"']], ","), '"a,b","quote ""x"""');
assert.equal(toTsv([["a", "b\tc"]]), "a\tb c");

console.log("CSV parser tests passed.");
