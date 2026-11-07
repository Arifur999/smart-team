import type { Metadata } from 'next';
import { ReviewQueue } from '@/components/review/ReviewQueue';

export const metadata: Metadata = { title: 'Review Booth' };

export default function ReviewPage() {
  return <ReviewQueue />;
}
