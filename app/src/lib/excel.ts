/**
 * Excel on the phone (SheetJS, official build from cdn.sheetjs.com): pick a spreadsheet
 * and read its first sheet as rows, or build a workbook and hand it to the share sheet
 * (saved in the app's cache first). In the browser the file is read and downloaded directly.
 */
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

const TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv', 'text/comma-separated-values',
];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The first sheet of a picked file as objects (header -> cell text), or null when cancelled. */
export async function pickSpreadsheet(): Promise<{ name: string; rows: Record<string, string>[] } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const asset = res.assets[0];
  const data = Platform.OS === 'web' && asset.file ? new Uint8Array(await asset.file.arrayBuffer()) : await new File(asset.uri).bytes();
  const wb = XLSX.read(data, { type: 'array', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
  return { name: asset.name || 'file.xlsx', rows };
}

/** Save sheets ([{ name, rows }]) as an .xlsx file and open the share sheet (download on the web). */
export async function shareWorkbook(fileName: string, sheets: { name: string; rows: any[][] }[], title?: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sh) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sh.rows), sh.name));
  if (Platform.OS === 'web') { XLSX.writeFile(wb, fileName); return; }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(out));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, dialogTitle: title, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}
