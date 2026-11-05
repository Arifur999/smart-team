import { redirect } from 'next/navigation';

// The Agent Office becomes the home page next; until then, tasks are the starting point.
export default function HomePage() {
  redirect('/tasks');
}
