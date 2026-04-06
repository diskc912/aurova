"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { migrateUsageToFirestore } from "@/lib/usageTracker";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Migrate guest usage to Firestore
      try {
        await migrateUsageToFirestore(result.user);
      } catch (err) {
        console.warn("Could not migrate usage to Firestore (check DB setup or rules):", err);
        // Do not throw! Let the user sign in successfully regardless of DB status.
      }
      return result.user;
    } catch (error) {
      console.error("Sign-in error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, logout };
}
