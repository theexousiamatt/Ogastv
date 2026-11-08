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
  const { segments } = await params;
  // The newsroom's entry point is the custom OgasTV Studio.
  // Keep /admin/login, /admin/account and advanced CMS subroutes intact.
  if (!segments?.length) redirect('/studio');
  // Staff use the custom Studio authentication and account UI.
  // Native verification/reset and advanced CMS tools stay temporarily until
  // their full migration is tested, to avoid locking staff out.
  if (segments[0] === 'login') redirect('/studio/login');
  if (segments[0] === 'account') redirect('/studio/account');
  return RootPage({ config, params, searchParams, importMap });
}
