import { auth } from '@/auth';
import { apiResponse } from '@/lib/utils/apiResponse';
import { isMaintenanceMode, MAINTENANCE_BYPASS_ROLES } from '@/lib/utils/maintenance';

export const GET = auth(async (req) => {
  const session = req.auth;
  
  return apiResponse(200, {
    maintenanceActive: isMaintenanceMode(),
    maintenanceEnvValue: process.env.MAINTENANCE_MODE,
    bypassRoles: MAINTENANCE_BYPASS_ROLES,
    sessionUser: {
      id: session?.user?.id,
      name: session?.user?.name,
      email: session?.user?.email,
      role: session?.user?.role,
    },
    isAdminBypassAllowed: session?.user?.role ? MAINTENANCE_BYPASS_ROLES.includes(session.user.role) : false,
    message: isMaintenanceMode() 
      ? `Maintenance active. User role: ${session?.user?.role}. Can bypass: ${session?.user?.role ? MAINTENANCE_BYPASS_ROLES.includes(session.user.role) : false}`
      : 'System running normally',
  });
});
