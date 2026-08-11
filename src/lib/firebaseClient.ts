import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseConfigError(): string | null {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    return `Firebase is not configured. Missing: ${missing.join(", ")}. Add them to carwash-web/.env.local and restart the dev server.`;
  }

  return null;
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  const configError = getFirebaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey: firebaseConfig.apiKey!,
          authDomain: firebaseConfig.authDomain!,
          projectId: firebaseConfig.projectId!,
          appId: firebaseConfig.appId!,
        });
  }

  if (!authInstance) {
    authInstance = getAuth(app);
  }

  return authInstance;
}

/** @deprecated Prefer getFirebaseAuth() so missing config fails clearly. */
export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getFirebaseAuth() as object, prop, receiver);
  },
});
