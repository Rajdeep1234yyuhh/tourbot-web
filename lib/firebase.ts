import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey:    process.env.FIREBASE_API_KEY!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
  appId:     process.env.FIREBASE_APP_ID!,
};

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
