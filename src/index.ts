import integration from './integration'

export type Integration = typeof integration
export default integration
export { defineConfig } from './config'

// noinspection JSUnusedGlobalSymbols
export { default as Auth } from './components/Auth.astro'
// noinspection JSUnusedGlobalSymbols
export { default as SignIn } from './components/SignIn.astro'
// noinspection JSUnusedGlobalSymbols
export { default as SignOut } from './components/SignOut.astro'
