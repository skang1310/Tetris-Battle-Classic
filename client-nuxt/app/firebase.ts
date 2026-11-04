import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const getConfig = () => {
    try {
        return useRuntimeConfig()
    } catch {
        return {
            public: {
                firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
                firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
                firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID
            }
        }
    }
}

const config = getConfig()
const firebaseConfig = {
    apiKey: config.public.firebaseApiKey as string,
    authDomain: config.public.firebaseAuthDomain as string,
    projectId: config.public.firebaseProjectId as string,
    storageBucket: config.public.firebaseStorageBucket as string,
    messagingSenderId: config.public.firebaseMessagingSenderId as string,
    appId: config.public.firebaseAppId as string
}

// Local installations work without the upstream owner's Firebase credentials.
export const db = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
    ? getFirestore(initializeApp(firebaseConfig))
    : null
