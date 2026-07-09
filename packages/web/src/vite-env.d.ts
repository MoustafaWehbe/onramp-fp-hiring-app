/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" once the backend Google OAuth endpoint is live. */
  readonly VITE_ENABLE_GOOGLE_OAUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
