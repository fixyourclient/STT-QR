import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'vn.qrdiemdanh.app',
  appName: 'Điểm danh QR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: { backgroundColor: '#F5F2EB', style: 'LIGHT' },
    Keyboard: { resize: 'body' },
  },
}

export default config
