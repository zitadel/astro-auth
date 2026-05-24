declare module '@auth/core/types' {
  // eslint-disable-next-line
  interface Session {
    idToken?: string;
    accessToken?: string;
    error?: string;
  }
}

declare module '@auth/core/jwt' {
  // eslint-disable-next-line
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}

interface ImportMetaEnv {
  readonly [key: string]: string | undefined;
}

// eslint-disable-next-line
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
