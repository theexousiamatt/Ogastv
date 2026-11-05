import type { Metadata } from 'next';
import { ActivationForm } from './ActivationForm';

export const metadata: Metadata = {
  title: 'Activate Newsroom Administrator',
  robots: { index: false, follow: false, noarchive: true },
  referrer: 'no-referrer',
};

export default function ActivateNewsroomPage() {
  return <ActivationForm />;
}
