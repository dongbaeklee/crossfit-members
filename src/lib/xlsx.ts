/**
 * 의존성 없는 최소 .xlsx 생성기 (시트 1개).
 *
 * SheetJS 같은 라이브러리를 넣으면 번들이 거의 두 배가 된다. 내려받기는 가끔 쓰는
 * 기능인데 그 값을 매 페이지 로딩이 치르게 된다. xlsx 는 XML 몇 개를 zip 으로 묶은
 * 것뿐이라 필요한 만큼만 직접 만든다.
 *
 * 구현 범위: 문자열(inline string)과 숫자 셀, 헤더 굵게, 열 너비, 틀 고정.
 * 수식·서식·여러 시트는 지원하지 않는다(필요해지면 그때 늘린다).
 *
 * zip 은 압축하지 않고 STORED(method 0) 로 넣는다. deflate 구현이 필요 없고,
 * 수백 행짜리 명단에서는 크기 차이가 의미 없다.
 */

export type Cell = string | number | null | undefined

// ── CRC32 (zip 헤더에 필요) ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ── XML ─────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // 엑셀은 XML 1.0 에서 허용되지 않는 제어문자를 만나면 파일을 못 연다고 뱉는다
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

/** 0 → A, 25 → Z, 26 → AA */
function colName(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function cellXml(value: Cell, ref: string, header: boolean): string {
  const style = header ? ' s="1"' : ''
  if (value === null || value === undefined || value === '') return `<c r="${ref}"${style}/>`
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`
}

function sheetXml(rows: Cell[][], widths: number[]): string {
  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const body = rows
    .map((row, r) => {
      const cells = row.map((v, c) => cellXml(v, `${colName(c)}${r + 1}`, r === 0)).join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // 헤더 한 줄 고정 — 197행을 훑을 때 열 이름이 계속 보여야 한다
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    cols +
    `<sheetData>${body}</sheetData>` +
    '</worksheet>'
  )
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

/** 스타일은 두 개만: 0=기본, 1=굵게(헤더) */
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font>' +
  '<font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  // cellStyles 가 없으면 "기본 스타일 없음" 경고가 난다. 엑셀은 대체로 넘어가지만
  // 판독기에 따라 걸리므로 채워 둔다.
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

function workbookXml(sheetName: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${esc(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  )
}

// ── zip (STORED) ────────────────────────────────────────────
/**
 * TS 5.7 부터 Uint8Array 가 버퍼 타입에 대해 제네릭이라, 기본 Uint8Array
 * (= Uint8Array<ArrayBufferLike>) 는 SharedArrayBuffer 가능성 때문에 BlobPart 로
 * 받아주지 않는다. 이 파일에서 만드는 건 전부 일반 ArrayBuffer 이므로 좁혀 둔다.
 */
type Bytes = Uint8Array<ArrayBuffer>

interface Entry {
  path: string
  data: Bytes
}

function u16(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff]
}
function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
}

function zip(entries: Entry[]): Blob {
  const enc = new TextEncoder()
  const chunks: Bytes[] = []
  const central: number[] = []
  let offset = 0

  for (const e of entries) {
    const name = enc.encode(e.path)
    const crc = crc32(e.data)
    const local = [
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0x0800), // UTF-8 파일명 플래그 — 한글 시트 경로는 안 쓰지만 안전하게
      ...u16(0), // method: stored
      ...u16(0), // time
      ...u16(0), // date
      ...u32(crc),
      ...u32(e.data.length),
      ...u32(e.data.length),
      ...u16(name.length),
      ...u16(0),
    ]
    chunks.push(new Uint8Array(local), name, e.data)
    const localSize = local.length + name.length + e.data.length

    central.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(e.data.length),
      ...u32(e.data.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...Array.from(name),
    )
    offset += localSize
  }

  const centralBytes = new Uint8Array(central)
  const end = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralBytes.length),
    ...u32(offset),
    ...u16(0),
  ])

  return new Blob([...chunks, centralBytes, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * 2차원 배열을 .xlsx Blob 으로. 첫 행은 헤더로 굵게 처리된다.
 * widths 는 열 너비(엑셀 문자 단위), 생략하면 기본값.
 */
export function buildXlsx(rows: Cell[][], opts: { sheetName?: string; widths?: number[] } = {}): Blob {
  const enc = new TextEncoder()
  const file = (path: string, xml: string): Entry => ({ path, data: enc.encode(xml) })
  return zip([
    file('[Content_Types].xml', CONTENT_TYPES),
    file('_rels/.rels', ROOT_RELS),
    file('xl/workbook.xml', workbookXml(opts.sheetName ?? 'Sheet1')),
    file('xl/_rels/workbook.xml.rels', WORKBOOK_RELS),
    file('xl/styles.xml', STYLES),
    file('xl/worksheets/sheet1.xml', sheetXml(rows, opts.widths ?? [])),
  ])
}

/** 브라우저에서 파일로 저장 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
