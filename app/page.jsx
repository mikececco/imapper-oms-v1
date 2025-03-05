import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect to dashboard for consistency
  redirect('/dashboard');
} 