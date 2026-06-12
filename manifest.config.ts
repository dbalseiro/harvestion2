import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
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
  // permissions: [
  //   'sidePanel',
  //   'contentSettings',
  // ],
  // content_scripts: [{
  //   // js: ['src/content/main.tsx'],
  //   matches: ['https://*/*'],
  // }]
  // side_panel: {
  //   default_path: 'src/sidepanel/index.html',
  // },
})
