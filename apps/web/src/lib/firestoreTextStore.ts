/**
 * Firebase Firestore Free-Tier Text Data Store
 * Provides persistent text document storage (memos, notes, cancellation text, review remarks)
 * powered by Cloud Firestore's Spark Free Plan (1 GB storage, 50,000 free reads/day).
 */
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { firestore, auth } from "./firebase";

export type TextCategory =
  | "general"
  | "commitment_note"
  | "cancellation_note"
  | "merchant_memo"
  | "audit";

export interface TextRecord {
  id: string;
  title: string;
  content: string;
  category: TextCategory;
  entityId?: string; // e.g. commitment UUID, merchant name, or cancellation case UUID
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION_NAME = "payscope_text_records";
function ownerId(): string {
  try { return JSON.parse(localStorage.getItem("payscope_demo_user") || "null")?.uid || auth?.currentUser?.uid || "anonymous"; }
  catch { return "anonymous"; }
}
function cloudNotesEnabled(): boolean { return !!auth?.currentUser && !localStorage.getItem("payscope_demo_user"); }
function localStorageKey(): string { return `payscope_fallback_text_records:${ownerId()}`; }

/**
 * Helper to get local fallback storage
 */
function getLocalFallback(): TextRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFallback(records: TextRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localStorageKey(), JSON.stringify(records));
  } catch (e) {
    console.warn("Could not save to localStorage fallback:", e);
  }
}

/**
 * Saves or updates a text record in Cloud Firestore (Spark Free Plan).
 */
export async function saveTextRecord(
  input: Omit<TextRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<TextRecord> {
  const now = new Date().toISOString();
  const id = input.id || `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: TextRecord = {
    ...input,
    userId: ownerId(),
    id,
    createdAt: now,
    updatedAt: now,
  };

  // If Firestore is available, save directly to Cloud Firestore
  if (firestore && cloudNotesEnabled()) {
    try {
      const docRef = doc(firestore, COLLECTION_NAME, id);
      await setDoc(
        docRef,
        {
          ...record,
          firestoreTimestamp: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firestore write error, falling back to local cache:", err);
    }
  }

  // Also sync locally as backup
  const locals = getLocalFallback().filter((r) => r.id !== id);
  locals.unshift(record);
  saveLocalFallback(locals);

  return record;
}

/**
 * Retrieves all text records filtered by category or associated entity.
 */
export async function listTextRecords(filters?: {
  category?: TextCategory;
  entityId?: string;
  userId?: string;
}): Promise<TextRecord[]> {
  if (firestore && cloudNotesEnabled()) {
    try {
      const colRef = collection(firestore, COLLECTION_NAME);
      const constraints: QueryConstraint[] = [where("userId", "==", ownerId())];

      if (filters?.category) {
        constraints.push(where("category", "==", filters.category));
      }
      if (filters?.entityId) {
        constraints.push(where("entityId", "==", filters.entityId));
      }
      if (filters?.userId) {
        constraints.push(where("userId", "==", filters.userId));
      }

      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      const snapshot = await getDocs(q);

      const remoteRecords: TextRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        remoteRecords.push({
          id: d.id,
          title: data.title || "Untitled",
          content: data.content || "",
          category: data.category || "general",
          entityId: data.entityId,
          userId: data.userId,
          userEmail: data.userEmail,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      if (remoteRecords.length > 0) {
        return remoteRecords;
      }
    } catch (err) {
      console.warn("Firestore read note (using local cache if available):", err);
    }
  }

  // Fallback to local cache
  let records = getLocalFallback().filter(record => record.userId === ownerId());
  if (filters?.category) {
    records = records.filter((r) => r.category === filters.category);
  }
  if (filters?.entityId) {
    records = records.filter((r) => r.entityId === filters.entityId);
  }
  if (filters?.userId) {
    records = records.filter((r) => r.userId === filters.userId);
  }
  return records;
}

/**
 * Deletes a text record by ID.
 */
export async function deleteTextRecord(id: string): Promise<boolean> {
  if (firestore && cloudNotesEnabled()) {
    try {
      const ref = doc(firestore, COLLECTION_NAME, id);
      const record = await getDoc(ref);
      if (record.exists() && record.data().userId !== ownerId()) throw new Error("You cannot delete another user's note.");
      await deleteDoc(ref);
    } catch (err) {
      console.warn("Firestore delete warning:", err);
    }
  }

  const locals = getLocalFallback().filter((r) => r.id !== id);
  saveLocalFallback(locals);
  return true;
}

/**
 * Subscribes to real-time updates for text records from Firestore.
 */
export function subscribeTextRecords(
  onUpdate: (records: TextRecord[]) => void,
  filters?: { category?: TextCategory; entityId?: string }
): () => void {
  if (!firestore || !cloudNotesEnabled()) {
    onUpdate(getLocalFallback());
    return () => {};
  }

  try {
    const colRef = collection(firestore, COLLECTION_NAME);
    const constraints: QueryConstraint[] = [where("userId", "==", ownerId())];
    if (filters?.category) {
      constraints.push(where("category", "==", filters.category));
    }
    if (filters?.entityId) {
      constraints.push(where("entityId", "==", filters.entityId));
    }

    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: TextRecord[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          records.push({
            id: d.id,
            title: data.title || "Untitled",
            content: data.content || "",
            category: data.category || "general",
            entityId: data.entityId,
            userId: data.userId,
            userEmail: data.userEmail,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        onUpdate(records);
      },
      (err) => {
        console.warn("Firestore snapshot listener note:", err);
        onUpdate(getLocalFallback());
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn("Could not bind snapshot listener:", e);
    onUpdate(getLocalFallback());
    return () => {};
  }
}

