import JSZip from "jszip";
import type { ChartPoint } from "./chart";

// 엑셀 파일에 "엑셀 자체 선 그래프"를 넣는다. (ExcelJS는 그래프를 만들 수 없어서 완성된 .xlsx 파일(zip)에 그래프 부품을 직접 끼워 넣는다.)
// 지표 하나만 내려받는 엑셀(lib/excel.ts)이 쓴다. 그래프의 값은 화면 그래프와 같은 chartSeries 값이다.
// 그래프는 시트의 숨긴 열(값만 있는 열)을 읽는다. 표의 평균 열에는 "누락" 글자가 있어서, 그대로 읽으면 엑셀이 0으로 그리기 때문이다.
// 값이 비어 있는 분기는 점 없이 선이 끊긴다. (dispBlanksAs = gap)

export type ExcelChartSpec = {
  sheetName: string;
  title: string; // 그래프 제목, 예: "영업활동 현금흐름 분기별 평균"
  unit: string; // 세로축 제목, 예: "억원"
  seriesName: string; // 선 이름 (머리글 칸 값)
  seriesNameCell: string; // 선 이름이 적힌 칸, 예: "C1"
  categoryColumn: string; // 분기가 적힌 열, 예: "A"
  valueColumn: string; // 그래프가 읽는 값 열(숨긴 열), 예: "F"
  points: ChartPoint[]; // 둘째 줄부터 한 줄에 하나
  anchor: { fromCol: number; toCol: number; rows: number }; // 그래프를 놓을 칸 (0부터 센 열 번호)
};

const NS_C = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_XDR = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const BLUE = "1F6FEB";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 시트 이름은 공백·한글이 있어서 작은따옴표로 감싼다.
function ref(sheetName: string, range: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

function richText(text: string, size: number, bold: boolean): string {
  return (
    `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}"/></a:pPr>` +
    `<a:r><a:rPr lang="ko-KR" sz="${size}" b="${bold ? 1 : 0}"/><a:t>${esc(text)}</a:t></a:r></a:p></c:rich></c:tx>`
  );
}

export function chartXml(spec: ExcelChartSpec): string {
  const first = 2;
  const last = spec.points.length + 1;
  const col = (c: string) => `$${c}$${first}:$${c}$${last}`;

  const catPts = spec.points
    .map((p, i) => `<c:pt idx="${i}"><c:v>${esc(p.quarter)}</c:v></c:pt>`)
    .join("");
  const valPts = spec.points
    .map((p, i) => (p.value === null ? "" : `<c:pt idx="${i}"><c:v>${p.value}</c:v></c:pt>`))
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>` +
    `<c:title>${richText(spec.title, 1400, true)}<c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>` +
    `<c:ser><c:idx val="0"/><c:order val="0"/>` +
    `<c:tx><c:strRef><c:f>${esc(ref(spec.sheetName, `$${spec.seriesNameCell[0]}$${spec.seriesNameCell.slice(1)}`))}</c:f>` +
    `<c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(spec.seriesName)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
    `<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${BLUE}"/></a:solidFill><a:round/></a:ln></c:spPr>` +
    `<c:marker><c:symbol val="circle"/><c:size val="7"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>` +
    `<a:ln w="28575"><a:solidFill><a:srgbClr val="${BLUE}"/></a:solidFill></a:ln></c:spPr></c:marker>` +
    `<c:cat><c:strRef><c:f>${esc(ref(spec.sheetName, col(spec.categoryColumn)))}</c:f>` +
    `<c:strCache><c:ptCount val="${spec.points.length}"/>${catPts}</c:strCache></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${esc(ref(spec.sheetName, col(spec.valueColumn)))}</c:f>` +
    `<c:numCache><c:formatCode>#,##0.00</c:formatCode><c:ptCount val="${spec.points.length}"/>${valPts}</c:numCache></c:numRef></c:val>` +
    `<c:smooth val="0"/></c:ser>` +
    `<c:marker val="1"/><c:axId val="50010001"/><c:axId val="50010002"/></c:lineChart>` +
    `<c:catAx><c:axId val="50010001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>` +
    `<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>` +
    `<c:crossAx val="50010002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="50010002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>` +
    `<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E3E9F1"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `<c:title>${richText(spec.unit, 1000, false)}<c:overlay val="0"/></c:title>` +
    `<c:numFmt formatCode="#,##0.00" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>` +
    `<c:crossAx val="50010001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea>` +
    `<c:plotVisOnly val="0"/><c:dispBlanksAs val="gap"/>` +
    `</c:chart></c:chartSpace>`
  );
}

export function drawingXml(anchor: ExcelChartSpec["anchor"]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}">` +
    `<xdr:twoCellAnchor>` +
    `<xdr:from><xdr:col>${anchor.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${anchor.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${anchor.rows}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="지표 그래프"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
    `<a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId1"/></a:graphicData></a:graphic>` +
    `</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`
  );
}

const REL_HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

// 완성된 .xlsx(첫 시트)에 선 그래프 한 개를 끼워 넣어 새 파일 내용을 돌려준다.
export async function addLineChart(xlsx: Buffer, spec: ExcelChartSpec): Promise<Buffer> {
  const zip = await JSZip.loadAsync(xlsx);

  zip.file("xl/charts/chart1.xml", chartXml(spec));
  zip.file("xl/drawings/drawing1.xml", drawingXml(spec.anchor));
  zip.file(
    "xl/drawings/_rels/drawing1.xml.rels",
    `${REL_HEAD}<Relationship Id="rId1" Type="${NS_R}/chart" Target="../charts/chart1.xml"/></Relationships>`,
  );
  zip.file(
    "xl/worksheets/_rels/sheet1.xml.rels",
    `${REL_HEAD}<Relationship Id="rId1" Type="${NS_R}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
  );

  const typesFile = zip.file("[Content_Types].xml");
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!typesFile || !sheetFile) throw new Error("엑셀 파일 구조를 읽지 못했습니다.");

  const types = await typesFile.async("string");
  zip.file(
    "[Content_Types].xml",
    types.replace(
      "</Types>",
      `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` +
        `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`,
    ),
  );

  // 시트 끝(</worksheet> 바로 앞)에 그림 연결을 넣는다. ExcelJS는 시트 끝에 쪽 설정만 쓰므로 순서가 맞다.
  const sheet = await sheetFile.async("string");
  zip.file(
    "xl/worksheets/sheet1.xml",
    sheet.replace("</worksheet>", `<drawing xmlns:r="${NS_R}" r:id="rId1"/></worksheet>`),
  );

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}
