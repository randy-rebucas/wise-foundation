import { auth } from '@/auth';
import { successResponse, forbiddenResponse } from '@/lib/utils/apiResponse';
import { isMaintenanceMode } from '@/lib/utils/maintenance';

export const GET = auth(async (req) => {
  return successResponse({
    maintenanceMode: isMaintenanceMode(),
    message: isMaintenanceMode()
      ? 'System is currently under maintenance'
      : 'System is running normally',
  });
});
