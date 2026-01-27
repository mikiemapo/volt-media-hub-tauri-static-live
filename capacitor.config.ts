import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.az104.mediahub',
    appName: 'AZ-104 Media Hub Pro',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
