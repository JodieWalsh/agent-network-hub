// Permission System - Feature Flags Approach
// Default: All authenticated users have basic permissions

export type Permission = 
  | 'CAN_POST_REQUESTS'
  | 'CAN_SUBMIT_BIDS'
  | 'CAN_SEND_MESSAGES'
  | 'CAN_ACCESS_PREMIUM_FEATURES';

interface UserPermissionContext {
  isAuthenticated: boolean;
  isVerified: boolean;
}

// Default permissions for all authenticated users
const DEFAULT_PERMISSIONS: Permission[] = [
  'CAN_POST_REQUESTS',
  'CAN_SUBMIT_BIDS',
  'CAN_SEND_MESSAGES',
];

// Additional permissions for verified users
const VERIFIED_PERMISSIONS: Permission[] = [
  ...DEFAULT_PERMISSIONS,
  'CAN_ACCESS_PREMIUM_FEATURES',
];

export function getPermissions(context: UserPermissionContext): Permission[] {
  if (!context.isAuthenticated) {
    return [];
  }
  
  if (context.isVerified) {
    return VERIFIED_PERMISSIONS;
  }
  
  return DEFAULT_PERMISSIONS;
}

export function hasPermission(
  context: UserPermissionContext, 
  permission: Permission
): boolean {
  return getPermissions(context).includes(permission);
}

export function canPost(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_POST_REQUESTS');
}

export function canBid(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_SUBMIT_BIDS');
}

export function canMessage(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_SEND_MESSAGES');
}
