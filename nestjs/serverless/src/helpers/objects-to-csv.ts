import moment from 'moment-timezone';
import { unparse } from 'papaparse';

interface Record {
  [key: string]: any;
}

const formatDate = (
  obj: Record[],
  dateFormat: string,
  dateTimezone: string,
  keys: string[],
) => {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    for (let j = 0; j < obj.length; j++) {
      const row = obj[j];
      const value = row[key];
      // quick and dirty hack how to detect timestamps
      // a big number greater than 19 years ago most likely a ts in ms :)
      // good enough for this csv purpose
      const timestampLike = Number.isInteger(value) && value > 1000000000000;
      if (timestampLike || value instanceof Date) {
        row[key] = moment(value)
          .tz(dateTimezone)
          .format(dateFormat);
        continue;
      } else if (!value) {
        continue;
      }
      break;
    }
  }
};

const useFields = (obj: Record[], columns: string[]) => {
  if (!Array.isArray(columns)) columns = [columns];
  return obj.forEach((row, i) => {
    const result = {};
    columns.forEach(col => (result[col] = row[col]));
    obj[i] = result;
  });
};

/**
 *
 * @param obj
 * @param dateFormat
 * @param dateTimezoneOffset timezone offset in minutes
 * @param headers
 */
export const objectsToCsv = (
  obj: Record[],
  dateFormat?: string,
  dateTimezone?: string,
  headers?: { [key: string]: string },
) => {
  if (!obj.length) return '';

  let keys: string[];
  let resultColumns: string[];
  if (headers) {
    keys = Object.keys(headers);
    useFields(obj, keys);
    resultColumns = Object.values(headers);
  } else {
    keys = Object.keys(obj[0]);
    resultColumns = keys;
  }

  if (dateFormat) formatDate(obj, dateFormat, dateTimezone, keys);
  return `${resultColumns}\n${unparse(obj, { header: false })}`;
};
