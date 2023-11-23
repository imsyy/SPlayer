// indexedDB
import { defineStore } from "pinia";
import localforage from "localforage";

const useIndexedDBStore = defineStore("indexedDB", {
  state: () => ({
    filesDB: localforage.createInstance({
      name: "filesDB",
    }),
    usersDB: localforage.createInstance({
      name: "usersDB",
    }),
  }),
  getters: {},
  actions: {
    async setfilesDB(key, value) {
      try {
        await this.filesDB.setItem(key, value);
      } catch (error) {
        console.error("Error setting data in IndexedDB:", error);
        throw error;
      }
    },
    async getfilesDB(key) {
      try {
        const value = await this.filesDB.getItem(key);
        return value;
      } catch (error) {
        console.error("Error retrieving data from IndexedDB:", error);
        throw error;
      }
    },
  },
});

export default useIndexedDBStore;
