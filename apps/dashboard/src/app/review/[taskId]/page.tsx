import type { Metadata } from 'next';
import { ReviewBooth } from '@/components/review/ReviewBooth';

export const metadata: Metadata = { title: 'Review Booth' };

// Everything on this page is live data loaded in the browser, so there is no static shell worth prerendering.
export const instant = false;

export default async function ReviewTaskPage({ params }: PageProps<'/review/[taskId]'>) {
  const { taskId } = await params;
  return <ReviewBooth taskId={taskId} />;
}
