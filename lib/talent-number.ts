export type NumberPair = {
  left: number;
  right: number;
  total: number;
};

export type TalentNumberLinkageCodes = {
  innerNumber: number;
  subconsciousNumber: number;
  laterYearsCode: string;
  rows: {
    inner: string[];
    subconscious: string[];
    laterYears: string[];
  };
  groups: {
    leftBottomFoundation: string;
    rightBottomFoundation: string;
    upperFoundation: string;
    leftBottomDayToMiddle: string;
    leftBottomMonthToMiddle: string;
    leftOutside: string;
    upperLeftToRoof: string;
    upperRightToRoof: string;
    upperOutside: string;
    rightBottomPrefixToMiddle: string;
    rightBottomSuffixToMiddle: string;
    rightOutside: string;
  };
};

export type TalentNumberMapData = {
  birthDate: string;
  source: {
    day: string;
    month: string;
    year: string;
  };
  inner: {
    base: {
      day: number;
      month: number;
      yearPrefix: number;
      yearSuffix: number;
    };
    middle: {
      left: number;
      right: number;
    };
    roof: number;
  };
  outer: {
    workAndFriends: NumberPair;
    descendants: NumberPair;
    laterYears: NumberPair;
  };
  linkage: TalentNumberLinkageCodes;
};

export function reduceTalentNumber(value: number) {
  let current = Math.abs(Math.trunc(value));
  while (current > 9) {
    current = String(current).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return current;
}

export function compactBirthDateToIso(value: string) {
  if (!/^\d{8}$/.test(value)) throw new Error("请输入 8 位阳历生日。");
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

const LUNAR_START_YEAR = 1900;
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63
];
const LUNAR_END_YEAR = LUNAR_START_YEAR + LUNAR_INFO.length - 1;
const LUNAR_BASE_DATE_UTC = Date.UTC(1900, 0, 31);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function lunarInfo(year: number) {
  return LUNAR_INFO[year - LUNAR_START_YEAR];
}

function leapMonth(year: number) {
  return lunarInfo(year) & 0xf;
}

function leapDays(year: number) {
  const month = leapMonth(year);
  if (!month) return 0;
  return lunarInfo(year) & 0x10000 ? 30 : 29;
}

function lunarMonthDays(year: number, month: number) {
  return lunarInfo(year) & (0x10000 >> month) ? 30 : 29;
}

function lunarYearDays(year: number) {
  let days = 348;
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (lunarInfo(year) & bit) days += 1;
  }
  return days + leapDays(year);
}

function formatIsoFromUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function lunarBirthDateToIso(value: string, isLeapMonth = false) {
  if (!/^\d{8}$/.test(value)) throw new Error("请输入 8 位农历生日。");
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year < LUNAR_START_YEAR || year > LUNAR_END_YEAR) {
    throw new Error(`农历生日暂支持 ${LUNAR_START_YEAR}-${LUNAR_END_YEAR} 年。`);
  }
  if (month < 1 || month > 12) throw new Error("农历月份无效。");
  const leap = leapMonth(year);
  const maxDay = isLeapMonth ? leapDays(year) : lunarMonthDays(year, month);
  if (isLeapMonth && leap !== month) throw new Error("该年份没有对应的闰月。");
  if (day < 1 || day > maxDay) throw new Error("农历日期无效。");

  let offset = 0;
  for (let currentYear = LUNAR_START_YEAR; currentYear < year; currentYear += 1) {
    offset += lunarYearDays(currentYear);
  }

  for (let currentMonth = 1; currentMonth < month; currentMonth += 1) {
    offset += lunarMonthDays(year, currentMonth);
    if (leap === currentMonth) offset += leapDays(year);
  }

  if (isLeapMonth) offset += lunarMonthDays(year, month);
  offset += day - 1;

  return formatIsoFromUtcDate(new Date(LUNAR_BASE_DATE_UTC + offset * DAY_IN_MS));
}

function reducedSum(left: number, right: number) {
  return reduceTalentNumber(left + right);
}

function code(...values: number[]) {
  return values.join("");
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("出生日期格式不正确。");
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("出生日期无效。");
  }
  return { yearText, monthText, dayText };
}

export function calculateTalentNumberMap(birthDate: string): TalentNumberMapData {
  const { yearText, monthText, dayText } = parseBirthDate(birthDate);

  const day = reduceTalentNumber(Number(dayText[0]) + Number(dayText[1]));
  const month = reduceTalentNumber(Number(monthText[0]) + Number(monthText[1]));
  const yearPrefix = reduceTalentNumber(Number(yearText[0]) + Number(yearText[1]));
  const yearSuffix = reduceTalentNumber(Number(yearText[2]) + Number(yearText[3]));
  const middleLeft = reducedSum(day, month);
  const middleRight = reducedSum(yearPrefix, yearSuffix);
  const roof = reducedSum(middleLeft, middleRight);

  const workLeft = reducedSum(middleLeft, day);
  const workRight = reducedSum(middleLeft, month);
  const descendantLeft = reducedSum(roof, middleRight);
  const descendantRight = reducedSum(roof, middleLeft);
  const laterLeft = reducedSum(middleRight, yearPrefix);
  const laterRight = reducedSum(middleRight, yearSuffix);
  const outer = {
    workAndFriends: { left: workLeft, right: workRight, total: reducedSum(workLeft, workRight) },
    descendants: { left: descendantLeft, right: descendantRight, total: reducedSum(descendantLeft, descendantRight) },
    laterYears: { left: laterLeft, right: laterRight, total: reducedSum(laterLeft, laterRight) }
  };

  const innerNumber = reduceTalentNumber(roof * 2);
  const subconsciousNumber = reduceTalentNumber(day + roof + yearSuffix);
  const linkageGroups = {
    leftBottomFoundation: code(day, month, middleLeft),
    rightBottomFoundation: code(yearPrefix, yearSuffix, middleRight),
    upperFoundation: code(middleLeft, middleRight, roof),
    leftBottomDayToMiddle: code(day, middleLeft, workLeft),
    leftBottomMonthToMiddle: code(month, middleLeft, workRight),
    leftOutside: code(workLeft, workRight, outer.workAndFriends.total),
    upperLeftToRoof: code(middleLeft, roof, descendantRight),
    upperRightToRoof: code(middleRight, roof, descendantLeft),
    upperOutside: code(descendantLeft, descendantRight, outer.descendants.total),
    rightBottomPrefixToMiddle: code(yearPrefix, middleRight, laterLeft),
    rightBottomSuffixToMiddle: code(yearSuffix, middleRight, laterRight),
    rightOutside: code(laterLeft, laterRight, outer.laterYears.total)
  };

  return {
    birthDate,
    source: { day: dayText, month: monthText, year: yearText },
    inner: {
      base: { day, month, yearPrefix, yearSuffix },
      middle: { left: middleLeft, right: middleRight },
      roof
    },
    outer,
    linkage: {
      innerNumber,
      subconsciousNumber,
      laterYearsCode: linkageGroups.rightOutside,
      rows: {
        inner: [
          linkageGroups.leftBottomFoundation,
          linkageGroups.leftBottomDayToMiddle,
          linkageGroups.upperLeftToRoof,
          linkageGroups.rightBottomPrefixToMiddle
        ],
        subconscious: [
          linkageGroups.rightBottomFoundation,
          linkageGroups.leftBottomMonthToMiddle,
          linkageGroups.upperRightToRoof,
          linkageGroups.rightBottomSuffixToMiddle
        ],
        laterYears: [
          linkageGroups.upperFoundation,
          linkageGroups.leftOutside,
          linkageGroups.upperOutside,
          linkageGroups.rightOutside
        ]
      },
      groups: linkageGroups
    }
  };
}
