import { idbSyncStore } from "../db";
import { createApi } from "./api";

/** The app's one API client and store: the real network and IndexedDB. */
export const api = createApi();
export const store = idbSyncStore;
