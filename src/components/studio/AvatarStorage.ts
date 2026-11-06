import { AvatarParameters, DEFAULT_AVATAR_PARAMS } from './AvatarEngine';

export interface SavedAvatarRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  parameters: AvatarParameters;
}

export class AvatarStorage {
  private static DB_NAME = 'ShopsoneAvatarStudioDB';
  private static STORE_NAME = 'avatars';
  private static DB_VERSION = 1;

  public static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  public static async saveAvatar(name: string, parameters: AvatarParameters): Promise<SavedAvatarRecord> {
    const db = await this.openDB();
    const record: SavedAvatarRecord = {
      id: 'avatar_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name || 'My Custom Avatar',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parameters
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  public static async updateAvatar(id: string, name: string, parameters: AvatarParameters): Promise<SavedAvatarRecord> {
    const db = await this.openDB();
    const existing = await this.getAvatar(id);
    const record: SavedAvatarRecord = {
      id,
      name: name || existing?.name || 'My Custom Avatar',
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      parameters
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  public static async getAvatar(id: string): Promise<SavedAvatarRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public static async getAllAvatars(): Promise<SavedAvatarRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public static async deleteAvatar(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
