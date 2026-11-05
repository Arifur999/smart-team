import { TaskView } from '@/components/TaskView';

// Everything on this page is live data loaded in the browser, so there is no static shell worth prerendering.
export const instant = false;

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const { id } = await params;
  return <TaskView taskId={id} />;
}
