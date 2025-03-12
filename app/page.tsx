'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/collection');
  }, [router]);
  
  return (
    <div className="py-8 text-center">
      <p>Redirecting to Collection Analyzer...</p>
    </div>
  );
} 