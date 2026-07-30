import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTalentNumberMap,
  compactBirthDateToIso,
  lunarBirthDateToIso,
  reduceTalentNumber
} from "../lib/talent-number.ts";

test("reduces multi-digit sums to one digit", () => {
  assert.equal(reduceTalentNumber(10), 1);
  assert.equal(reduceTalentNumber(17), 8);
  assert.equal(reduceTalentNumber(29), 2);
});

test("calculates the 10/02/1980 example", () => {
  const map = calculateTalentNumberMap("1980-02-10");
  assert.deepEqual(map.inner.base, { day: 1, month: 2, yearPrefix: 1, yearSuffix: 8 });
  assert.deepEqual(map.inner.middle, { left: 3, right: 9 });
  assert.equal(map.inner.roof, 3);
  assert.deepEqual(map.outer.workAndFriends, { left: 4, right: 5, total: 9 });
  assert.deepEqual(map.outer.descendants, { left: 3, right: 6, total: 9 });
  assert.deepEqual(map.outer.laterYears, { left: 1, right: 8, total: 9 });
  assert.equal(map.linkage.innerNumber, 6);
  assert.equal(map.linkage.subconsciousNumber, 3);
  assert.equal(map.linkage.laterYearsCode, "189");
  assert.deepEqual(map.linkage.rows.inner, ["123", "134", "336", "191"]);
  assert.deepEqual(map.linkage.rows.subconscious, ["189", "235", "933", "898"]);
  assert.deepEqual(map.linkage.rows.laterYears, ["393", "459", "369", "189"]);
});

test("calculates the 30/08/1989 layout example", () => {
  const map = calculateTalentNumberMap(compactBirthDateToIso("19890830"));
  assert.deepEqual(map.inner.base, { day: 3, month: 8, yearPrefix: 1, yearSuffix: 8 });
  assert.deepEqual(map.inner.middle, { left: 2, right: 9 });
  assert.equal(map.inner.roof, 2);
  assert.deepEqual(map.outer.workAndFriends, { left: 5, right: 1, total: 6 });
  assert.deepEqual(map.outer.descendants, { left: 2, right: 4, total: 6 });
  assert.deepEqual(map.outer.laterYears, { left: 1, right: 8, total: 9 });
  assert.equal(map.linkage.innerNumber, 4);
  assert.equal(map.linkage.subconsciousNumber, 4);
  assert.equal(map.linkage.laterYearsCode, "189");
  assert.deepEqual(map.linkage.rows.inner, ["382", "325", "224", "191"]);
  assert.deepEqual(map.linkage.rows.subconscious, ["189", "821", "922", "898"]);
  assert.deepEqual(map.linkage.rows.laterYears, ["292", "516", "246", "189"]);
  assert.deepEqual(map.linkage.groups, {
    leftBottomFoundation: "382",
    rightBottomFoundation: "189",
    upperFoundation: "292",
    leftBottomDayToMiddle: "325",
    leftBottomMonthToMiddle: "821",
    leftOutside: "516",
    upperLeftToRoof: "224",
    upperRightToRoof: "922",
    upperOutside: "246",
    rightBottomPrefixToMiddle: "191",
    rightBottomSuffixToMiddle: "898",
    rightOutside: "189"
  });
});

test("converts lunar birthdays to solar birthdays before calculation", () => {
  assert.equal(lunarBirthDateToIso("19890101"), "1989-02-06");
  assert.equal(lunarBirthDateToIso("20240101"), "2024-02-10");
  assert.equal(lunarBirthDateToIso("20260101"), "2026-02-17");
});

test("rejects impossible calendar dates", () => {
  assert.throws(() => calculateTalentNumberMap("2025-02-30"), /出生日期无效/);
  assert.throws(() => lunarBirthDateToIso("20240231"), /农历日期无效/);
});
