import { AlertTriangle } from 'lucide-react';
import { auth } from '@/auth';

export const metadata = {
  title: 'Under Maintenance',
  description: 'Our system is currently under maintenance. Please try again later.',
};

export default async function MaintenancePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full">
            <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-500" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Under Maintenance
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          We're currently performing system maintenance. All users are temporarily locked out.
        </p>

        <div className="space-y-4 mb-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Thank you for your patience while we improve your experience.
          </p>
          {session?.user && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You have been logged out. Please try again after maintenance is complete.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If you need immediate assistance, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
