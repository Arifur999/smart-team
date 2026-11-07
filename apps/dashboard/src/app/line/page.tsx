import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductionLine } from '@/components/line/ProductionLine';

export const metadata: Metadata = { title: 'Production Line' };

export default function LinePage() {
  return (
    <Suspense fallback={<main id="main" className="flex-1" />}>
      <ProductionLine />
    </Suspense>
  );
}
