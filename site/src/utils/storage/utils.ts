import * as localForage from "localforage";
import { isObject, isInteger, arrayify } from "@ohmycv/utils";
import type { ValidVersion } from "~/composables/constant";
import type { ResumeStyles } from "~/composables/stores/style";
import type { DbResume } from "./db";
import type { ValidStorageJsonData } from "./migrate";

/**
 * Write resume styles from local storage to the store
 *
 * @param styles resume styles
 */
const setResumeStyles = async (styles: ResumeStyles) => {
  const { setStyle } = useStyleStore();

  for (const [key, value] of Object.entries(styles)) {
    await setStyle(key as keyof ResumeStyles, value);
  }
};

/**
 * Write resume data from local storage to the store
 *
 * @param data resume data
 */
export const setResume = async (data: DbResume) => {
  const { setData } = useDataStore();

  setData("resumeId", data.id);
  setData("resumeName", data.name);

  setData("markdown", data.markdown);
  setData("css", data.css);

  await setResumeStyles(data.styles);
};

const _checkType = (value: any, required: string | string[]) => {
  return arrayify(required).includes(typeof value);
};

const _getNestedValue = (object: any, path: string) => {
  return path.split(".").reduce((o, p) => (o ? o[p] : undefined), object);
};

const _checkObject = (
  obj: any,
  fields: Array<{ fields: string | string[]; types: string | string[] }>
): boolean => {
  return fields.every(({ fields, types }) =>
    arrayify(fields).every((field) => _checkType(_getNestedValue(obj, field), types))
  );
};

export class IsValid {
  static font = (font: any) =>
    isObject(font) &&
    typeof font.name === "string" &&
    ["string", "undefined"].includes(typeof font.fontFamily);

  static importedData = (data: any, version: any) => {
    const { VERSION } = useConstant();

    return (
      // Check version
      typeof version === "string" &&
      VERSION.isVersionValid(version) &&
      // Check data
      isObject(data) &&
      Object.entries(data).every(
        ([id, item]) =>
          isInteger(id, { allowString: true }) &&
          _checkObject(item, VERSION.REQUIRED_DATA_TYPES[version as ValidVersion])
      )
    );
  };

  static importedJson(
    json: any
  ): false | { version: ValidVersion; data: ValidStorageJsonData } {
    const { VERSION } = useConstant();

    if (!isObject(json)) return false;

    if (this.importedData(json.data, json.version)) {
      return json;
    } else if (this.importedData(json, VERSION.EMPTY_FALLBACK)) {
      return {
        data: json,
        version: VERSION.EMPTY_FALLBACK
      };
    }

    return false;
  }
}

export class StorageVersion {
  static get = async (): Promise<ValidVersion | null> => {
    const { VERSION } = useConstant();
    return await localForage.getItem<ValidVersion>(VERSION.VERSION_KEY);
  };

  static update = async () => {
    const { VERSION } = useConstant();
    await localForage.setItem(VERSION.VERSION_KEY, VERSION.CURRENT);
    return VERSION.CURRENT;
  };
}
