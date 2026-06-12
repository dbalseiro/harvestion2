import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  permissions: ['storage', 'tabs'],
  host_permissions: ['https://api.harvestapp.com/*'],
  icons: {
    48: 'public/icon48.png',
    16: 'public/icon16.png',
    128: 'public/icon128.png',
  },
  action: {
    default_icon: {
      48: 'public/icon48.png',
      16: 'public/icon16.png',
      128: 'public/icon128.png',
    },
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
})
