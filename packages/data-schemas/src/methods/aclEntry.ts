import { Types } from 'mongoose';
import { PrincipalType, PrincipalModel } from 'librechat-data-provider';
import type { Model, DeleteResult, ClientSession } from 'mongoose';
import type { IAclEntry, GroupRole } from '~/types';

export function createAclEntryMethods(mongoose: typeof import('mongoose')) {
  type PrincipalInput = {
    principalType: string;
    principalId?: string | Types.ObjectId;
    groupRole?: GroupRole;
  };

  const ALL_GROUP_ROLES: GroupRole[] = ['owner', 'editor', 'viewer'];

  const buildPrincipalRoleMap = (principalsList: PrincipalInput[]) => {
    const map = new Map<string, GroupRole>();
    principalsList.forEach((principal) => {
      if (
        principal.principalType === PrincipalType.GROUP &&
        principal.principalId != null &&
        principal.groupRole
      ) {
        const key =
          typeof principal.principalId === 'string'
            ? principal.principalId
            : principal.principalId.toString();
        map.set(key, principal.groupRole);
      }
    });
    return map;
  };

  type GroupRoleOptions = {
    skipGroupRoleCheck?: boolean;
  };

  const entryMatchesGroupRole = (
    entry: IAclEntry,
    principalRoleMap: Map<string, GroupRole>,
    options: GroupRoleOptions = {},
  ) => {
    if (options.skipGroupRoleCheck && entry.principalType === PrincipalType.GROUP) {
      return true;
    }

    if (
      entry.principalType !== PrincipalType.GROUP ||
      !entry.groupRoles ||
      entry.groupRoles.length === 0
    ) {
      return true;
    }

    const principalId =
      typeof entry.principalId === 'string'
        ? entry.principalId
        : entry.principalId?.toString();
    if (!principalId) {
      return false;
    }
    const userRole = principalRoleMap.get(principalId);
    if (!userRole) {
      return false;
    }
    return entry.groupRoles.includes(userRole);
  };
  /**
   * Find ACL entries for a specific principal (user or group)
   * @param principalType - The type of principal ('user', 'group')
   * @param principalId - The ID of the principal
   * @param resourceType - Optional filter by resource type
   * @returns Array of ACL entries
   */
  async function findEntriesByPrincipal(
    principalType: string,
    principalId: string | Types.ObjectId,
    resourceType?: string,
  ): Promise<IAclEntry[]> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const query: Record<string, unknown> = { principalType, principalId };
    if (resourceType) {
      query.resourceType = resourceType;
    }
    return await AclEntry.find(query).lean();
  }

  /**
   * Find ACL entries for a specific resource
   * @param resourceType - The type of resource ('agent', 'project', 'file')
   * @param resourceId - The ID of the resource
   * @returns Array of ACL entries
   */
  async function findEntriesByResource(
    resourceType: string,
    resourceId: string | Types.ObjectId,
  ): Promise<IAclEntry[]> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    return await AclEntry.find({ resourceType, resourceId }).lean();
  }

  /**
   * Find all ACL entries for a set of principals (including public)
   * @param principalsList - List of principals, each containing { principalType, principalId }
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @returns Array of matching ACL entries
   */
  async function findEntriesByPrincipalsAndResource(
    principalsList: PrincipalInput[],
    resourceType: string,
    resourceId: string | Types.ObjectId,
    options: GroupRoleOptions = {},
  ): Promise<IAclEntry[]> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const principalsQuery = principalsList.map((p) => ({
      principalType: p.principalType,
      ...(p.principalType !== PrincipalType.PUBLIC && { principalId: p.principalId }),
    }));

    const entries = await AclEntry.find({
      $or: principalsQuery,
      resourceType,
      resourceId,
    }).lean();

    const principalRoleMap = buildPrincipalRoleMap(principalsList);
    return entries.filter((entry) => entryMatchesGroupRole(entry, principalRoleMap, options));
  }

  /**
   * Check if a set of principals has a specific permission on a resource
   * @param principalsList - List of principals, each containing { principalType, principalId }
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @param permissionBit - The permission bit to check (use PermissionBits enum)
   * @returns Whether any of the principals has the permission
   */
  async function hasPermission(
    principalsList: PrincipalInput[],
    resourceType: string,
    resourceId: string | Types.ObjectId,
    permissionBit: number,
    options: GroupRoleOptions = {},
  ): Promise<boolean> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const principalsQuery = principalsList.map((p) => ({
      principalType: p.principalType,
      ...(p.principalType !== PrincipalType.PUBLIC && { principalId: p.principalId }),
    }));

    const principalRoleMap = buildPrincipalRoleMap(principalsList);

    const entries = await AclEntry.find({
      $or: principalsQuery,
      resourceType,
      resourceId,
      permBits: { $bitsAllSet: permissionBit },
    }).lean();

    return entries.some((entry) => entryMatchesGroupRole(entry, principalRoleMap, options));
  }

  /**
   * Get the combined effective permissions for a set of principals on a resource
   * @param principalsList - List of principals, each containing { principalType, principalId }
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @returns {Promise<number>} Effective permission bitmask
   */
  async function getEffectivePermissions(
    principalsList: PrincipalInput[],
    resourceType: string,
    resourceId: string | Types.ObjectId,
  ): Promise<number> {
    const aclEntries = await findEntriesByPrincipalsAndResource(
      principalsList,
      resourceType,
      resourceId,
    );

    let effectiveBits = 0;
    for (const entry of aclEntries) {
      effectiveBits |= entry.permBits;
    }
    return effectiveBits;
  }

  /**
   * Grant permission to a principal for a resource
   * @param principalType - The type of principal ('user', 'group', 'public')
   * @param principalId - The ID of the principal (null for 'public')
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @param permBits - The permission bits to grant
   * @param grantedBy - The ID of the user granting the permission
   * @param session - Optional MongoDB session for transactions
   * @param roleId - Optional role ID to associate with this permission
   * @returns The created or updated ACL entry
   */
  async function grantPermission(
    principalType: string,
    principalId: string | Types.ObjectId | null,
    resourceType: string,
    resourceId: string | Types.ObjectId,
    permBits: number,
    grantedBy: string | Types.ObjectId,
    session?: ClientSession,
    roleId?: string | Types.ObjectId,
    groupRoles?: GroupRole[],
  ): Promise<IAclEntry | null> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const query: Record<string, unknown> = {
      principalType,
      resourceType,
      resourceId,
    };

    if (principalType !== PrincipalType.PUBLIC) {
      query.principalId =
        typeof principalId === 'string' && principalType !== PrincipalType.ROLE
          ? new Types.ObjectId(principalId)
          : principalId;
      if (principalType === PrincipalType.USER) {
        query.principalModel = PrincipalModel.USER;
      } else if (principalType === PrincipalType.GROUP) {
        query.principalModel = PrincipalModel.GROUP;
      } else if (principalType === PrincipalType.ROLE) {
        query.principalModel = PrincipalModel.ROLE;
      }
    }

    const update: Record<string, Record<string, unknown>> = {
      $set: {
        permBits,
        grantedBy,
        grantedAt: new Date(),
        ...(roleId && { roleId }),
      },
    };

    if (principalType === PrincipalType.GROUP) {
      update.$set.groupRoles =
        groupRoles && groupRoles.length > 0 ? groupRoles : ALL_GROUP_ROLES;
    } else {
      update.$unset = { groupRoles: '' };
    }

    const options = {
      upsert: true,
      new: true,
      ...(session ? { session } : {}),
    };

    return await AclEntry.findOneAndUpdate(query, update, options);
  }

  /**
   * Revoke permissions from a principal for a resource
   * @param principalType - The type of principal ('user', 'group', 'public')
   * @param principalId - The ID of the principal (null for 'public')
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @param session - Optional MongoDB session for transactions
   * @returns The result of the delete operation
   */
  async function revokePermission(
    principalType: string,
    principalId: string | Types.ObjectId | null,
    resourceType: string,
    resourceId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<DeleteResult> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const query: Record<string, unknown> = {
      principalType,
      resourceType,
      resourceId,
    };

    if (principalType !== PrincipalType.PUBLIC) {
      query.principalId =
        typeof principalId === 'string' && principalType !== PrincipalType.ROLE
          ? new Types.ObjectId(principalId)
          : principalId;
    }

    const options = session ? { session } : {};

    return await AclEntry.deleteOne(query, options);
  }

  /**
   * Modify existing permission bits for a principal on a resource
   * @param principalType - The type of principal ('user', 'group', 'public')
   * @param principalId - The ID of the principal (null for 'public')
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @param addBits - Permission bits to add
   * @param removeBits - Permission bits to remove
   * @param session - Optional MongoDB session for transactions
   * @returns The updated ACL entry
   */
  async function modifyPermissionBits(
    principalType: string,
    principalId: string | Types.ObjectId | null,
    resourceType: string,
    resourceId: string | Types.ObjectId,
    addBits?: number | null,
    removeBits?: number | null,
    session?: ClientSession,
  ): Promise<IAclEntry | null> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const query: Record<string, unknown> = {
      principalType,
      resourceType,
      resourceId,
    };

    if (principalType !== PrincipalType.PUBLIC) {
      query.principalId =
        typeof principalId === 'string' && principalType !== PrincipalType.ROLE
          ? new Types.ObjectId(principalId)
          : principalId;
    }

    const update: Record<string, unknown> = {};

    if (addBits) {
      update.$bit = { permBits: { or: addBits } };
    }

    if (removeBits) {
      if (!update.$bit) update.$bit = {};
      const bitUpdate = update.$bit as Record<string, unknown>;
      bitUpdate.permBits = { ...(bitUpdate.permBits as Record<string, unknown>), and: ~removeBits };
    }

    const options = {
      new: true,
      ...(session ? { session } : {}),
    };

    return await AclEntry.findOneAndUpdate(query, update, options);
  }

  /**
   * Find all resources of a specific type that a set of principals has access to
   * @param principalsList - List of principals, each containing { principalType, principalId }
   * @param resourceType - The type of resource
   * @param requiredPermBit - Required permission bit (use PermissionBits enum)
   * @returns Array of resource IDs
   */
  async function findAccessibleResources(
    principalsList: PrincipalInput[],
    resourceType: string,
    requiredPermBit: number,
    options: GroupRoleOptions = {},
  ): Promise<Types.ObjectId[]> {
    const AclEntry = mongoose.models.AclEntry as Model<IAclEntry>;
    const principalsQuery = principalsList.map((p) => ({
      principalType: p.principalType,
      ...(p.principalType !== PrincipalType.PUBLIC && { principalId: p.principalId }),
    }));

    const entries = await AclEntry.find({
      $or: principalsQuery,
      resourceType,
      permBits: { $bitsAllSet: requiredPermBit },
    })
      .select('resourceId principalId principalType groupRoles')
      .lean();

    const principalRoleMap = buildPrincipalRoleMap(principalsList);
    const allowedResourceIds = new Set<string>();

    entries.forEach((entry) => {
      if (entryMatchesGroupRole(entry, principalRoleMap, options) && entry.resourceId) {
        allowedResourceIds.add(entry.resourceId.toString());
      }
    });

    return Array.from(allowedResourceIds).map((id) => new Types.ObjectId(id));
  }

  return {
    findEntriesByPrincipal,
    findEntriesByResource,
    findEntriesByPrincipalsAndResource,
    hasPermission,
    getEffectivePermissions,
    grantPermission,
    revokePermission,
    modifyPermissionBits,
    findAccessibleResources,
  };
}

export type AclEntryMethods = ReturnType<typeof createAclEntryMethods>;
