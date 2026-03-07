'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/Loading';

/**
 * Legacy /anime/[id] route — redirects to the home page.
 * All anime detail is now served via /watch/[slug].
 */
export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <LoadingSpinner />;
}
