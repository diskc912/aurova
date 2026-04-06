import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { UserDoc } from "@/types";

const STORAGE_KEY = "autocut_usage_count";
const FREE_LIMIT = 3;

/** Get the current guest usage count from localStorage */
export function getGuestUsage(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

/** Increment guest usage locally */
export function incrementGuestUsage(): number {
  const count = getGuestUsage() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

/** Check if guest has exceeded free limit */
export function isGuestLimitReached(): boolean {
  return getGuestUsage() >= FREE_LIMIT;
}

/** Migrate local usage to Firestore when user signs in */
export async function migrateUsageToFirestore(user: User): Promise<void> {
  const localCount = getGuestUsage();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // First sign-in: create user doc
    const userData: UserDoc = {
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      plan: "free",
      usageCount: localCount,
      createdAt: Date.now(),
      lastProcessedAt: Date.now(),
    };
    await setDoc(userRef, userData);
  } else {
    // Merge local count into existing
    if (localCount > 0) {
      await updateDoc(userRef, {
        usageCount: increment(localCount),
      });
    }
  }

  // Clear local counter after migration
  localStorage.removeItem(STORAGE_KEY);
}

/** Increment usage in Firestore for a logged-in user */
export async function incrementFirestoreUsage(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    usageCount: increment(1),
    lastProcessedAt: Date.now(),
  });
}

/** Get the usage count (either local or from Firestore) */
export async function getUsageCount(user: User | null): Promise<number> {
  if (!user) return getGuestUsage();

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return (snap.data() as UserDoc).usageCount;
  }
  return 0;
}

export { FREE_LIMIT };
