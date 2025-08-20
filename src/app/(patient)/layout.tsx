import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Patient Feedback - Hospital Feedback System',
  description: 'Share your feedback about your hospital experience',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="kiosk-container">
      {children}
    </div>
  );
}