import type { PartialWithRequired } from "@ohmycv/utils";
import type { ResumeStyles } from "~/composables/stores/style";

export type DbResumeEmpty = {
  name: string;
  markdown: string;
  css: string;
  styles: ResumeStyles;
};

export interface DbResume extends DbResumeEmpty {
  /**
   * A unique id for each row in the database
   */
  id: number;

  /**
   * The last update time of the resume
   */
  updated_at: string;

  /**
   * The create time of the resume
   */
  created_at: string;
}

export type DbResumeUpdate = PartialWithRequired<DbResume, "id">;

export type DbServiceError = {
  message: string;
};

export type DbServiceResponse<T> = Promise<
  { data: T | null; error: null } | { data: null; error: DbServiceError }
>;

export type StorageJson = {
  version: string;
  data: {
    [id: string]: Omit<DbResume, "id">;
  };
};

export type StorageJsonData = StorageJson["data"];

export interface DbService {
  queryAll(): DbServiceResponse<Array<DbResume>>;
  queryById(id: number): DbServiceResponse<DbResume>;
  update(data: DbResumeUpdate, newUpdateTime: boolean): DbServiceResponse<DbResume>;
  create(data: DbResumeEmpty | DbResume): DbServiceResponse<DbResume>;
  delete(id: number): DbServiceResponse<DbResume>;
}

export type DbServiceConstructor = new () => DbService;
