import { auth } from '@/auth';
import { successResponse } from '@/lib/utils/apiResponse';
import { isMaintenanceMode } from '@/lib/utils/maintenance';

export const GET = auth(async (req) => {
  return successResponse({
    maintenanceActive: isMaintenanceMode(),
    maintenanceEnvValue: process.env.MAINTENANCE_MODE,
    sessionUser: {
      id: req.auth?.user?.id,
      name: req.auth?.user?.name,
      email: req.auth?.user?.email,
      role: req.auth?.user?.role,
    },
    message: isMaintenanceMode() 
      ? `Maintenance active. User: ${req.auth?.user?.name} (${req.auth?.user?.role})`
      : 'System running normally',
  });
});
