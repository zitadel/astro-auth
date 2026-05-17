import { createAuthOptions } from './src/lib/auth.js';

// noinspection JSUnusedGlobalSymbols
export default createAuthOptions((key: string) => import.meta.env[key]);
