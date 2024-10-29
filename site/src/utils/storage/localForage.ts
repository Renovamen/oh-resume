import * as localForage from "localforage";
import { isClient, copy, now } from "@ohmycv/utils";
import type {
  DbService,
  StorageJsonData,
  DbResume,
  DbResumeEmpty,
  DbResumeUpdate
} from "./db";
import { StorageVersion } from "./utils";
import { MigrateService, type ValidStorageJsonData } from "./migrate";

export class LocalForageDbService implements DbService {
  private _key = "ohmycv_data";

  private _storageError = () => ({
    data: null,
    error: {
      message: "Error occurred while accessing local storage."
    }
  });

  private _notFoundError = (id: number) => ({
    data: null,
    error: {
      message: `Resume ${id} not found.`
    }
  });

  private _success = <T>(data: T) => ({
    data,
    error: null
  });

  /**
   * Get the storage object. Note that this method will return an empty object
   * instead of null if the storage is empty. While a null return value indicates
   * an error occurred while accessing the storage.
   *
   * @returns Storage object or null if an error occurred
   */
  private async _storage(): Promise<StorageJsonData | null> {
    if (!isClient) return null; // Server-side rendering

    try {
      const storage = await localForage.getItem<ValidStorageJsonData>(this._key);
      const _from = await StorageVersion.get();

      // The storage is not initialized
      if (!storage) {
        // An empty version might indicate that the storage is not initialized, or the
        // storage version is "v0". Here the storage is not initialized, so we can safely
        // update the version to the latest.
        if (!_from) await StorageVersion.update();
        return {};
      }

      // Migrate the storage from old versions if needed
      // From now on, we can safely assume the storage version is "v0" if the version is empty
      const migrateService = new MigrateService(_from);
      const { data, to, from } = await migrateService.migrate(storage);

      if (from !== to) {
        // Set the migrated storage
        await this._setItems(data);
        // Update the storage version to the latest
        await StorageVersion.update();
        // Backup the old storage
        await localForage.setItem(`${this._key}_${from}`, storage);
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  private async _setItems(storage: StorageJsonData) {
    await localForage.setItem(this._key, storage);
  }

  /**
   * Check if the resume exists in the storage
   *
   * @param id
   * @param allowNotExist If true, will not return error if the resume does not exist
   *
   * @returns Error if the storage is not available or the resume does not exist,
   *         otherwise the whole storage object
   */
  private async _getStorageIfIdExists(id: number, allowNotExist: boolean = false) {
    const storage = await this._storage();

    // Check storage
    if (!storage) return this._storageError();
    // Check if resume exists
    if (!storage[id])
      return allowNotExist ? this._success(null) : this._notFoundError(id);

    return this._success(storage);
  }

  public async queryAll() {
    const storage = await this._storage();

    if (!storage) return this._storageError();

    const data = Object.entries(storage)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort(
        (a, b) =>
          b.updated_at.localeCompare(a.updated_at) ||
          b.created_at.localeCompare(a.created_at)
      );

    return this._success(data);
  }

  public async queryById(id: number) {
    const res = await this._getStorageIfIdExists(id, true);

    if (!res.data) return res;
    else return this._success({ id, ...res.data[id] });
  }

  public async update(data: DbResumeUpdate, newUpdateTime: boolean) {
    const res = await this._getStorageIfIdExists(data.id);
    if (res.error) return res;

    const storage = res.data!;
    const { id, ...updatedResume } = {
      ...storage[data.id],
      ...data,
      updated_at: newUpdateTime ? now().toString() : storage[data.id].updated_at
    };

    storage[id] = updatedResume;
    await this._setItems(storage);

    return this._success({ id, ...updatedResume });
  }

  public async create(data: DbResumeEmpty | DbResume) {
    const storage = await this._storage();

    // Check storage
    if (!storage) return this._storageError();

    // Check if resume already exists
    if ("id" in data && storage[data.id]) {
      return {
        data: null,
        error: {
          message: `Resume ${data.id} already exists.`
        }
      };
    }

    const _now = now();

    // Generate a new "id", "updated_at" and "created_at" if not provided
    const createdData: DbResume = {
      updated_at: _now.toString(),
      created_at: _now.toString(),
      id: _now,
      ...data
    };

    const { id, ...resume } = createdData;

    storage[id] = resume;
    await this._setItems(storage);

    return this._success(createdData);
  }

  public async delete(id: number) {
    const res = await this._getStorageIfIdExists(id);
    if (res.error) return res;

    const storage = res.data!;
    const deleted = copy(storage[id]);

    delete storage[id];
    await this._setItems(storage);

    return this._success({ id, ...deleted });
  }
}
