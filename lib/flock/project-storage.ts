import type { Project } from "./types"

const DATABASE_NAME = "murmur-projects"
const DATABASE_VERSION = 1
const STORE_NAME = "projects"
const ACTIVE_PROJECT_KEY = "active:v2"
const LEGACY_STORAGE_KEY = "murmur.project.v1"

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open project storage"))
  })
}

async function readIndexedProject() {
  const database = await openDatabase()
  try {
    return await new Promise<Project | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly")
      const request = transaction.objectStore(STORE_NAME).get(ACTIVE_PROJECT_KEY)
      request.onsuccess = () => resolve((request.result as Project | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error("Could not read the saved project"))
    })
  } finally {
    database.close()
  }
}

async function writeIndexedProject(project: Project) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite")
      transaction.objectStore(STORE_NAME).put(project, ACTIVE_PROJECT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the project"))
      transaction.onabort = () => reject(transaction.error ?? new Error("Project save was interrupted"))
    })
  } finally {
    database.close()
  }
}

function readLegacyProject() {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  return raw ? JSON.parse(raw) as Project : null
}

export async function loadStoredProject() {
  try {
    const indexed = await readIndexedProject()
    if (indexed) return indexed
  } catch {
    // Fall through to the small-project legacy store.
  }
  try {
    return readLegacyProject()
  } catch {
    return null
  }
}

export async function saveStoredProject(project: Project) {
  try {
    await writeIndexedProject(project)
    return "indexeddb" as const
  } catch (indexedError) {
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(project))
      return "localstorage" as const
    } catch {
      throw indexedError
    }
  }
}
