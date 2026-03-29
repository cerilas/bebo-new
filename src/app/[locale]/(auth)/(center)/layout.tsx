import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function CenteredLayout(props: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 sm:left-8 sm:top-8"
      >
        <ChevronLeft className="size-4" />
        Ana Sayfaya Dön
      </Link>
      {props.children}
    </div>
  );
}
