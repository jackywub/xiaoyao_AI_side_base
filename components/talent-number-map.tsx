import type { RefObject } from "react";

import type { TalentNumberMapData } from "@/lib/talent-number";

type TalentNumberMapProps = {
  data: TalentNumberMapData | null;
  svgRef?: RefObject<SVGSVGElement | null>;
};

const orange = "#d99a35";
const deepOrange = "#5147e5";
const ink = "#111111";
const muted = "#786f68";
const card = "#fffefa";
const panelBorder = "#ded5ca";
const warmBackground = "#f3ecdf";
const gold = "#d98217";
const primarySoft = "#efedff";
const handwriting = "Ma Shan Zheng, KaiTi, STKaiti, cursive";

function value(data: TalentNumberMapData | null, number: number | undefined) {
  return data ? String(number) : "";
}

function textValue(data: TalentNumberMapData | null, text: string | undefined) {
  return data ? text || "" : "–";
}

export function TalentNumberMap({ data, svgRef }: TalentNumberMapProps) {
  const base = data?.inner.base;
  const middle = data?.inner.middle;
  const work = data?.outer.workAndFriends;
  const descendants = data?.outer.descendants;
  const later = data?.outer.laterYears;
  const linkage = data?.linkage;
  const source = data
    ? [data.source.day, data.source.month, data.source.year.slice(0, 2), data.source.year.slice(2)]
    : ["–", "–", "–", "–"];
  const linkageRows = [
    {
      label: "内心数字",
      value: textValue(data, linkage?.innerNumber ? String(linkage.innerNumber) : undefined),
      codes: linkage?.rows.inner || ["–", "–", "–", "–"]
    },
    {
      label: "潜意识数字",
      value: textValue(data, linkage?.subconsciousNumber ? String(linkage.subconsciousNumber) : undefined),
      codes: linkage?.rows.subconscious || ["–", "–", "–", "–"]
    },
    {
      label: "晚年数字",
      value: textValue(data, linkage?.laterYearsCode),
      codes: linkage?.rows.laterYears || ["–", "–", "–", "–"]
    }
  ];

  return (
    <svg
      aria-label={data ? `${data.birthDate} 的天赋数字地图` : "等待输入出生日期的天赋数字地图"}
      className="h-auto w-full"
      data-testid="talent-number-map"
      ref={svgRef}
      role="img"
      viewBox="0 0 760 1048"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill={warmBackground} height="1048" width="760" />
      <circle cx="-8" cy="8" fill={primarySoft} r="92" />
      <circle cx="764" cy="12" fill="#fff2df" r="88" />
      <circle cx="726" cy="34" fill="#e7e2ff" opacity="0.65" r="42" />
      <rect fill={card} height="680" rx="34" width="704" x="28" y="44" />

      <g transform="translate(0 48)">
      <path d="M118 290 L380 100 L642 290" fill={card} stroke={orange} strokeWidth="2" />
      <rect fill={card} height="288" stroke={orange} strokeWidth="2" width="524" x="118" y="290" />
      <line stroke={orange} strokeWidth="2" x1="118" x2="642" y1="432" y2="432" />
      <line stroke={orange} strokeWidth="2" x1="380" x2="380" y1="290" y2="578" />

      <text dominantBaseline="middle" fill={gold} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="56" fontWeight="700" textAnchor="middle" x="380" y="164">*</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="64" fontWeight="700" textAnchor="middle" x="380" y="224">{value(data, data?.inner.roof)}</text>

      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="48" fontWeight="700" textAnchor="middle" x="272" y="362">{value(data, middle?.left)}</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="48" fontWeight="700" textAnchor="middle" x="506" y="362">{value(data, middle?.right)}</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="44" fontWeight="700" textAnchor="middle" x="190" y="506">{value(data, base?.day)}</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="44" fontWeight="700" textAnchor="middle" x="320" y="506">{value(data, base?.month)}</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="44" fontWeight="700" textAnchor="middle" x="444" y="506">{value(data, base?.yearPrefix)}</text>
      <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="44" fontWeight="700" textAnchor="middle" x="572" y="506">{value(data, base?.yearSuffix)}</text>

      {data ? <>
        <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="40" fontWeight="700" textAnchor="middle" x="294" y="116">{descendants?.left}</text>
        <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="40" fontWeight="700" textAnchor="middle" x="470" y="116">{descendants?.right}</text>
        <text dominantBaseline="middle" fill={deepOrange} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="44" fontWeight="700" textAnchor="middle" x="382" y="48">{descendants?.total}</text>
        <text dominantBaseline="middle" fill={gold} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="40" fontWeight="700" textAnchor="middle" x="64" y="230">{work?.total}={work?.left}{work?.right}</text>
        <text dominantBaseline="middle" fill={gold} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="40" fontWeight="700" textAnchor="middle" x="690" y="230">{later?.left}{later?.right}={later?.total}</text>
      </> : null}

      {source.map((part, index) => <text dominantBaseline="middle" fill={ink} fontFamily="Noto Serif SC, Songti SC, serif" fontSize="34" textAnchor="middle" x={[190, 320, 444, 572][index]} y="635" key={`${part}-${index}`}>{part}</text>)}
      </g>

      <rect fill={card} height="254" rx="32" width="704" x="28" y="760" />
      <line stroke={panelBorder} strokeWidth="2" x1="276" x2="276" y1="800" y2="986" />
      <text dominantBaseline="middle" fill={muted} fontFamily={handwriting} fontSize="30" fontWeight="700" textAnchor="middle" x="515" y="800">联动数字</text>

      {linkageRows.map((row, rowIndex) => {
        const y = 850 + rowIndex * 68;
        return (
          <g key={row.label}>
            <text dominantBaseline="middle" fill={muted} fontFamily={handwriting} fontSize="28" fontWeight="700" textAnchor="start" x="56" y={y}>{row.label}</text>
            <text dominantBaseline="middle" fill={ink} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="28" fontWeight="800" textAnchor="middle" x="226" y={y}>{row.value}</text>
            {row.codes.map((item, index) => (
              <text dominantBaseline="middle" fill={ink} fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="28" fontWeight="500" textAnchor="middle" x={[360, 480, 600, 694][index]} y={y} key={`${row.label}-${item}-${index}`}>{item}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
