import { auth } from '@/auth';
import { isMaintenanceMode, MAINTENANCE_BYPASS_ROLES } from '@/lib/utils/maintenance';
import { apiResponse } from '@/lib/utils/apiResponse';

export const GET = auth(async (req) => {
  // Only admins can check maintenance status
  if (!req.auth?.user?.role || !MAINTENANCE_BYPASS_ROLES.includes(req.auth.user.role)) {
    return apiResponse(403, { error: 'Forbidden' });
  }

  return apiResponse(200, {
    maintenanceMode: isMaintenanceMode(),
    message: isMaintenanceMode()
      ? 'System is currently under maintenance'
      : 'System is running normally',
  });
});
