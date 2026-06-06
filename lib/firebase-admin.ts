import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let _auth: Auth | null = null;

export function getAdminAuth(): Auth {
  if (_auth) return _auth;

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

  _auth = getAuth(app);
  return _auth;
}