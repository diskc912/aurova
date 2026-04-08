import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface UserSettings {
  threshold: number;
  minDuration: number;
  padding: number;
  exportMode: "fast" | "perfect";
  enhanceVoice: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  threshold: -30,
  minDuration: 0.5,
  padding: 0.2,
  exportMode: "fast",
  enhanceVoice: false,
};

/** Load settings from Firestore for a logged-in user. Falls back to defaults. */
export async function loadUserSettings(uid: string): Promise<UserSettings> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data.settings) {
        return { ...DEFAULT_SETTINGS, ...data.settings } as UserSettings;
      }
    }
  } catch (e) {
    console.warn("Could not load settings from Firestore:", e);
  }
  return DEFAULT_SETTINGS;
}

/** Save settings to Firestore for a logged-in user. Uses merge so other fields are preserved. */
export async function saveUserSettings(uid: string, settings: UserSettings): Promise<void> {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, { settings }, { merge: true });
  } catch (e) {
    console.warn("Could not save settings to Firestore:", e);
  }
}
