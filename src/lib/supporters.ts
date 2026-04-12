import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

export interface Supporter {
  id: string;
  name: string;
  amount: number;
  timestamp: Date;
}

export async function saveSupporter(name: string, amount: number): Promise<void> {
  const finalName = name.trim() === "" ? "Anonymous Hero" : name.trim();
  try {
    await addDoc(collection(db, "supporters"), {
      name: finalName,
      amount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error saving supporter to Firebase:", error);
  }
}

export async function getSupporters(): Promise<Supporter[]> {
  try {
    const q = query(
      collection(db, "supporters"),
      orderBy("amount", "desc"),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const supporters: Supporter[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      supporters.push({
        id: doc.id,
        name: data.name || "Anonymous Hero",
        amount: data.amount || 0,
        timestamp: data.timestamp?.toDate() || new Date()
      });
    });
    
    return supporters;
  } catch (error) {
    console.error("Error fetching supporters:", error);
    return [];
  }
}
