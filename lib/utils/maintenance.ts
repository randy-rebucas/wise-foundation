/**
 * Maintenance mode utilities
 */

export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === 'true';
}

export function isMaintenanceModeAdmin(role?: string): boolean {
  // No roles can bypass maintenance mode - everyone is blocked
  return false;
}

// Empty array means all roles are blocked during maintenance
export const MAINTENANCE_BYPASS_ROLES: string[] = [];
