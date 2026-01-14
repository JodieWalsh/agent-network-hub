// Role-Based Permission System
// ROLES = Permission levels (admin, verified_professional, pending_professional, guest)
// USER TYPES = Professions (buyers_agent, selling_agent, conveyancer, etc.)
// All professional types can have any role

export type UserRole = 'admin' | 'verified_professional' | 'pending_professional' | 'guest';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export type Permission =
  | 'CAN_VIEW_ADMIN_DASHBOARD'
  | 'CAN_APPROVE_USERS'
  | 'CAN_APPROVE_PROPERTIES'
  | 'CAN_SUBMIT_PROPERTY'
  | 'CAN_EDIT_OWN_PROPERTY'
  | 'CAN_DELETE_ANY_PROPERTY'
  | 'CAN_APPLY_FOR_PROFESSIONAL'
  | 'CAN_VIEW_MARKETPLACE'
  | 'CAN_VIEW_DIRECTORY'
  | 'CAN_POST_INSPECTIONS'
  | 'CAN_SEND_MESSAGES'
  | 'CAN_MANAGE_CLIENT_BRIEFS';

export interface UserPermissionContext {
  isAuthenticated: boolean;
  role: UserRole | null;
  approvalStatus: ApprovalStatus | null;
  userId: string | null;
}

// Role-based permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'CAN_VIEW_ADMIN_DASHBOARD',
    'CAN_APPROVE_USERS',
    'CAN_APPROVE_PROPERTIES',
    'CAN_SUBMIT_PROPERTY',
    'CAN_EDIT_OWN_PROPERTY',
    'CAN_DELETE_ANY_PROPERTY',
    'CAN_VIEW_MARKETPLACE',
    'CAN_VIEW_DIRECTORY',
    'CAN_POST_INSPECTIONS',
    'CAN_SEND_MESSAGES',
    'CAN_MANAGE_CLIENT_BRIEFS',
  ],
  verified_professional: [
    'CAN_SUBMIT_PROPERTY',
    'CAN_EDIT_OWN_PROPERTY',
    'CAN_VIEW_MARKETPLACE',
    'CAN_VIEW_DIRECTORY',
    'CAN_POST_INSPECTIONS',
    'CAN_SEND_MESSAGES',
    'CAN_MANAGE_CLIENT_BRIEFS',
  ],
  pending_professional: [
    'CAN_VIEW_MARKETPLACE',
    'CAN_VIEW_DIRECTORY',
  ],
  guest: [
    'CAN_APPLY_FOR_PROFESSIONAL',
    'CAN_VIEW_MARKETPLACE',
    'CAN_VIEW_DIRECTORY',
  ],
};

export function getPermissions(context: UserPermissionContext): Permission[] {
  if (!context.isAuthenticated || !context.role) {
    return [];
  }

  return ROLE_PERMISSIONS[context.role] || [];
}

export function hasPermission(
  context: UserPermissionContext,
  permission: Permission
): boolean {
  return getPermissions(context).includes(permission);
}

// Convenience functions for common permission checks
export function canAccessAdminDashboard(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_VIEW_ADMIN_DASHBOARD');
}

export function canSubmitProperty(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_SUBMIT_PROPERTY');
}

export function canApproveUsers(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_APPROVE_USERS');
}

export function canApproveProperties(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_APPROVE_PROPERTIES');
}

export function canApplyForProfessional(context: UserPermissionContext): boolean {
  return hasPermission(context, 'CAN_APPLY_FOR_PROFESSIONAL');
}

export function isAdmin(context: UserPermissionContext): boolean {
  return context.role === 'admin';
}

export function isVerifiedProfessional(context: UserPermissionContext): boolean {
  return context.role === 'verified_professional';
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    verified_professional: 'Verified Professional',
    pending_professional: 'Pending Professional',
    guest: 'Guest',
  };
  return labels[role];
}

export function getApprovalStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    approved: 'Approved',
    pending: 'Pending Review',
    rejected: 'Rejected',
  };
  return labels[status];
}
