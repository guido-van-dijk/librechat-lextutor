import type { Document, Types } from 'mongoose';
import { PrincipalType, PrincipalModel, ResourceType } from 'librechat-data-provider';
import type { GroupRole } from './group';

export type AclEntry = {
  /** The type of principal (PrincipalType.USER, PrincipalType.GROUP, PrincipalType.PUBLIC) */
  principalType: PrincipalType;
  /** The ID of the principal (null for PrincipalType.PUBLIC, string for PrincipalType.ROLE) */
  principalId?: Types.ObjectId | string;
  /** The model name for the principal (`PrincipalModel`) */
  principalModel?: PrincipalModel;
  /** The type of resource (`ResourceType`) */
  resourceType: ResourceType;
  /** The ID of the resource */
  resourceId: Types.ObjectId;
  /** Permission bits for this entry */
  permBits: number;
  /** Optional role ID for predefined roles */
  roleId?: Types.ObjectId;
  /** ID of the resource this permission is inherited from */
  inheritedFrom?: Types.ObjectId;
  /** ID of the user who granted this permission */
  grantedBy?: Types.ObjectId;
  /** When this permission was granted */
  grantedAt?: Date;
  /** Optional allowed group roles (if principalType = GROUP). Empty/undefined means all roles */
  groupRoles?: GroupRole[];
};

export type IAclEntry = AclEntry &
  Document & {
    _id: Types.ObjectId;
  };
