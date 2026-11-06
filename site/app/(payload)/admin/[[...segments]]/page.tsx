import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import config from '@payload-config';
import { RootPage, generatePageMetadata } from '@payloadcms/next/views';
import { importMap } from '../importMap';

type Props = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Props): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

export default async function Page({ params, searchParams }: Props) {
  // OgasTV Studio is the primary newsroom. Keep Payload's nested routes
  // available for login, account settings, and advanced editing.
  const { segments } = await params;
  if (!segments || segments.length === 0) {
    redirect('/studio');
  }
  return RootPage({ config, params, searchParams, importMap });
}
