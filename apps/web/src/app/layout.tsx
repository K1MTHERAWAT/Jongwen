import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-context';

export const metadata: Metadata = {
  title: 'สวัสดีครับพี่เบียร์ระบบนี้มีชื่อว่า Jongwen',
  description: 'ระบบบริหารจัดการสถานที่และทรัพยากรของหน่วยงานราชการ ผ่าน LINE OA',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
