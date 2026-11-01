import { parse } from 'exifr';
import { inspectImage } from '../image/inspect-image';
import type { ImageLimits } from '../image/limits';

export const fieldNames = {
  Make: ['设备品牌', 'Camera make'], Model: ['设备型号', 'Camera model'],
  LensMake: ['镜头品牌', 'Lens make'], LensModel: ['镜头型号', 'Lens model'],
  DateTimeOriginal: ['拍摄时间', 'Date taken'], CreateDate: ['创建时间', 'Date created'], ModifyDate: ['修改时间', 'Date modified'],
  Orientation: ['方向', 'Orientation'], Software: ['软件', 'Software'],
  ExposureTime: ['曝光时间', 'Exposure time'], FNumber: ['光圈', 'F-number'], ISO: ['ISO', 'ISO'], FocalLength: ['焦距', 'Focal length'],
  GPSLatitude: ['GPS 纬度', 'GPS latitude'], GPSLatitudeRef: ['纬度参考', 'Latitude reference'],
  GPSLongitude: ['GPS 经度', 'GPS longitude'], GPSLongitudeRef: ['经度参考', 'Longitude reference'],
  GPSAltitude: ['GPS 海拔', 'GPS altitude'], GPSAltitudeRef: ['海拔参考', 'Altitude reference'],
  GPSDateStamp: ['GPS 日期', 'GPS date'], GPSTimeStamp: ['GPS 时间', 'GPS time'],
  Artist: ['作者', 'Artist'], Copyright: ['版权', 'Copyright'], ImageDescription: ['图片描述', 'Image description'],
  CameraOwnerName: ['设备所有者', 'Camera owner'], BodySerialNumber: ['机身序列号', 'Body serial number'], LensSerialNumber: ['镜头序列号', 'Lens serial number'],
} as const;
export type MetadataField = {key: keyof typeof fieldNames; value: string; private: boolean};
export type MetadataView = {fields: MetadataField[]; blocks: string[]; partial: boolean};
function display(value: unknown): string | undefined {
  if (typeof value === 'string') return value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 512) || undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().replace('T', ' ').replace(/Z$/, ' UTC') : undefined;
  if (Array.isArray(value) && value.length <= 8) return value.map(display).filter(Boolean).join(', ') || undefined;
  return undefined;
}
/** Only bounded, container-validated TIFF payloads reach the read-only parser. */
export async function readMetadata(blob: Blob, limits: ImageLimits): Promise<MetadataView> {
  const fields: MetadataField[] = [], blocks = new Set<string>();
  let partial = false, exifSeen = false;
  await inspectImage(blob, limits.bytes, limits, async (reader, part) => {
    const {format, type, data, length} = part;
    const jpegExif = format === 'jpeg' && type === 0xe1 && length >= 6 &&
      String.fromCharCode(...await reader.read(data, 6)) === 'Exif\0\0';
    const isExif = jpegExif || type === 'eXIf' || type === 'EXIF';
    if (!isExif) {
      if (type === 0xe1) {
        const prefix = String.fromCharCode(...await reader.read(data, Math.min(length, 35)));
        blocks.add(prefix.startsWith('http://ns.adobe.com/xap/1.0/\0') || prefix.startsWith('http://ns.adobe.com/xmp/extension/\0') ? 'XMP' : 'APP1');
        partial = true;
      }
      if (type === 'XMP ') { blocks.add('XMP'); partial = true; }
      if (type === 0xed) { blocks.add('IPTC'); partial = true; }
      if (type === 0xfe || ['tEXt', 'iTXt', 'zTXt', 'tIME'].includes(String(type))) { blocks.add('Text'); partial = true; }
      return;
    }
    blocks.add('EXIF');
    if (exifSeen || length > 65536) { partial = true; return; }
    exifSeen = true;
    try {
      const payload = await reader.read(data, length);
      const prefix = String.fromCharCode(...payload.subarray(0, 6)) === 'Exif\0\0' ? 6 : 0;
      const tags: Record<string, unknown> | undefined = await parse(payload.slice(prefix), {
        pick: Object.keys(fieldNames), tiff: true, ifd1: false, interop: false,
        makerNote: false, userComment: false, xmp: false, icc: false, iptc: false,
        translateValues: false, reviveValues: false, sanitize: true,
      });
      for (const key of Object.keys(fieldNames) as (keyof typeof fieldNames)[]) {
        const value = display(tags?.[key]);
        if (value !== undefined) fields.push({key, value, private: /^(GPS|CameraOwner|BodySerial|LensSerial)|^(Artist|Copyright|DateTimeOriginal|CreateDate|ModifyDate)$/.test(key)});
      }
    } catch { partial = true; }
  });
  return {fields, blocks: [...blocks], partial};
}
