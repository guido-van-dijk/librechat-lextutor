import { useMemo, useState } from 'react';
import { Button, Input, Label, Spinner, useToastContext } from '@librechat/client';
import {
  useGroupsQuery,
  useCreateGroupMutation,
  useManageGroupMemberMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} from '~/data-provider';
import { useLocalize } from '~/hooks';

type ManageMemberRole = 'owner' | 'editor' | 'viewer';

type InviteState = {
  email: string;
  role: ManageMemberRole;
};

type EditingState = {
  name: string;
  description: string;
};

type ErrorWithMessage = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const err = error as ErrorWithMessage;
  return err?.response?.data?.message || err?.message;
};

export default function GroupsSettings() {
  const { data: groups, isLoading } = useGroupsQuery();
  const createGroup = useCreateGroupMutation();
  const manageMember = useManageGroupMemberMutation();
  const updateGroup = useUpdateGroupMutation();
  const deleteGroup = useDeleteGroupMutation();
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [inviteStates, setInviteStates] = useState<Record<string, InviteState>>({});
  const [editingGroups, setEditingGroups] = useState<Record<string, EditingState>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => [
      { value: 'owner', label: localize('com_ui_role_owner') },
      { value: 'editor', label: localize('com_ui_role_editor') },
      { value: 'viewer', label: localize('com_ui_role_viewer') },
    ],
    [localize],
  );

  const RoleSelect = ({
    value,
    onChange,
    disabled,
  }: {
    value: ManageMemberRole;
    onChange: (value: ManageMemberRole) => void;
    disabled?: boolean;
  }) => (
    <select
      className="rounded-md border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
      value={value}
      onChange={(event) => onChange(event.target.value as ManageMemberRole)}
      disabled={disabled}
    >
      {roleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const getRoleLabel = (role: string) =>
    roleOptions.find((option) => option.value === role)?.label ?? role;

  const handleCreateGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newGroup.name.trim()) {
      showToast({ message: localize('com_admin_groups_name_required'), variant: 'danger' });
      return;
    }
    createGroup.mutate(
      { name: newGroup.name.trim(), description: newGroup.description.trim() },
      {
        onSuccess: () => {
          setNewGroup({ name: '', description: '' });
          showToast({ message: localize('com_admin_groups_created'), variant: 'success' });
        },
        onError: (error) => {
          showToast({
            message: getErrorMessage(error) ?? localize('com_admin_groups_create_error'),
            variant: 'danger',
          });
        },
      },
    );
  };

  const handleInvite = (groupId: string) => {
    const invite = inviteStates[groupId];
    if (!invite?.email) {
      showToast({ message: localize('com_admin_groups_member_email_required'), variant: 'danger' });
      return;
    }
    manageMember.mutate(
      {
        groupId,
        action: 'add',
        payload: {
          email: invite.email.trim(),
          role: invite.role || 'viewer',
        },
      },
      {
        onSuccess: () => {
          showToast({ message: localize('com_admin_groups_member_added'), variant: 'success' });
          setInviteStates((prev) => ({ ...prev, [groupId]: { email: '', role: 'viewer' } }));
        },
        onError: (error) => {
          showToast({
            message: getErrorMessage(error) ?? localize('com_ui_error'),
            variant: 'danger',
          });
        },
      },
    );
  };

  const handleRemoveMember = (groupId: string, memberId: string) => {
    manageMember.mutate(
      { groupId, memberId, action: 'remove' },
      {
        onSuccess: () => {
          showToast({ message: localize('com_admin_groups_member_removed'), variant: 'success' });
        },
        onError: (error) =>
          showToast({
            message: getErrorMessage(error) ?? localize('com_ui_error'),
            variant: 'danger',
          }),
      },
    );
  };

  const startEditingGroup = (groupId: string, groupName: string, groupDescription?: string) => {
    setEditingGroups((prev) => ({
      ...prev,
      [groupId]: {
        name: groupName,
        description: groupDescription ?? '',
      },
    }));
  };

  const cancelEditingGroup = (groupId: string) => {
    setEditingGroups((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  };

  const handleGroupInputChange = (groupId: string, field: keyof EditingState, value: string) => {
    setEditingGroups((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [field]: value,
      },
    }));
  };

  const handleSaveGroup = (groupId: string) => {
    const draft = editingGroups[groupId];
    if (!draft) {
      return;
    }
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      showToast({ message: localize('com_admin_groups_name_required'), variant: 'danger' });
      return;
    }

    const payload = {
      name: trimmedName,
      description: draft.description.trim(),
    };

    setSavingGroupId(groupId);
    updateGroup.mutate(
      { groupId, payload },
      {
        onSuccess: () => {
          showToast({ message: localize('com_admin_groups_update_success'), variant: 'success' });
          cancelEditingGroup(groupId);
        },
        onError: (error) => {
          showToast({
            message: getErrorMessage(error) ?? localize('com_admin_groups_update_error'),
            variant: 'danger',
          });
        },
        onSettled: () => setSavingGroupId(null),
      },
    );
  };

  const handleChangeRole = (groupId: string, memberId: string | undefined, role: ManageMemberRole) => {
    if (!memberId) {
      return;
    }
    manageMember.mutate(
      { groupId, memberId, action: 'update', payload: { role } },
      {
        onSuccess: () => {
          showToast({
            message: localize('com_admin_groups_member_role_updated'),
            variant: 'success',
          });
        },
        onError: (error) => {
          showToast({
            message: getErrorMessage(error) ?? localize('com_admin_groups_member_update_error'),
            variant: 'danger',
          });
        },
      },
    );
  };

  const isSavingGroup = (groupId: string) => updateGroup.isLoading && savingGroupId === groupId;
  const canCreateGroup = Boolean(newGroup.name.trim());

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    const confirmed = window.confirm(
      localize('com_admin_groups_delete_confirm', {
        0: groupName || localize('com_admin_groups_delete_fallback'),
      }),
    );
    if (!confirmed) {
      return;
    }

    deleteGroup.mutate(groupId, {
      onSuccess: () => {
        showToast({ message: localize('com_admin_groups_deleted'), variant: 'success' });
        cancelEditingGroup(groupId);
      },
      onError: (error) =>
        showToast({
          message: getErrorMessage(error) ?? localize('com_ui_error'),
          variant: 'danger',
        }),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          {localize('com_admin_groups_title')}
        </h3>
        <p className="text-sm text-text-secondary">{localize('com_admin_groups_description')}</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-border-medium p-4"
        onSubmit={handleCreateGroup}
      >
        <h4 className="text-sm font-semibold text-text-primary">
          {localize('com_admin_groups_create')}
        </h4>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-group-name">{localize('com_ui_name')}</Label>
          <Input
            id="new-group-name"
            value={newGroup.name}
            onChange={(event) => setNewGroup((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-group-description">{localize('com_ui_description')}</Label>
          <Input
            id="new-group-description"
            value={newGroup.description}
            onChange={(event) =>
              setNewGroup((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!canCreateGroup || createGroup.isLoading}>
            {createGroup.isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                {localize('com_ui_saving')}
              </div>
            ) : (
              localize('com_admin_groups_create_button')
            )}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-text-primary">
          {localize('com_admin_groups_existing')}
        </h4>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Spinner size="sm" />
            {localize('com_ui_loading')}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups?.map((group) => {
              const isEditing = Boolean(editingGroups[group.id]);
              const editingState = editingGroups[group.id];
              const inviteEmail = inviteStates[group.id]?.email ?? '';
              const canInviteMember = inviteEmail.trim().length > 0;

              return (
                <div key={group.id} className="rounded-lg border border-border-medium p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <Label>{localize('com_ui_name')}</Label>
                                <Input
                                  value={editingState?.name ?? ''}
                                  onChange={(event) =>
                                    handleGroupInputChange(group.id, 'name', event.target.value)
                                  }
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <Label>{localize('com_ui_description')}</Label>
                                <Input
                                  value={editingState?.description ?? ''}
                                  onChange={(event) =>
                                    handleGroupInputChange(
                                      group.id,
                                      'description',
                                      event.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-base font-semibold text-text-primary">
                                {group.name}
                              </h5>
                              {group.description && (
                                <p className="text-sm text-text-secondary">{group.description}</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelEditingGroup(group.id)}
                              >
                                {localize('com_ui_cancel')}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveGroup(group.id)}
                                disabled={isSavingGroup(group.id)}
                              >
                                {isSavingGroup(group.id) ? (
                                  <div className="flex items-center gap-2">
                                    <Spinner size="sm" />
                                    {localize('com_ui_saving')}
                                  </div>
                                ) : (
                                  localize('com_ui_save')
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingGroup(group.id, group.name, group.description)}
                            >
                              {localize('com_ui_edit')}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive focus-visible:text-destructive"
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            disabled={deleteGroup.isLoading}
                          >
                            {localize('com_admin_groups_delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                <div className="mt-4 flex flex-col gap-2">
                  <h6 className="text-sm font-medium text-text-primary">
                    {localize('com_admin_groups_members')}
                  </h6>
                  {group.members.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {localize('com_admin_groups_no_members')}
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm text-text-secondary">
                      {group.members.map((member) => (
                        <li
                          key={`${group.id}-${member.userId}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-secondary p-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">
                              {member.name || member.email}
                            </span>
                            <span className="text-xs uppercase text-text-secondary">
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <RoleSelect
                              value={member.role as ManageMemberRole}
                              onChange={(value) =>
                                handleChangeRole(group.id, member.userId, value)
                              }
                              disabled={manageMember.isLoading}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(group.id, member.userId)}
                              disabled={manageMember.isLoading}
                            >
                              {localize('com_ui_remove')}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2 rounded-md bg-surface-secondary p-3">
                  <Label>{localize('com_admin_groups_add_member')}</Label>
                  <Input
                    placeholder={localize('com_admin_groups_member_email')}
                    value={inviteStates[group.id]?.email ?? ''}
                    onChange={(event) =>
                      setInviteStates((prev) => ({
                        ...prev,
                        [group.id]: { email: event.target.value, role: prev[group.id]?.role || 'viewer' },
                      }))
                    }
                  />
                  <RoleSelect
                    value={(inviteStates[group.id]?.role ?? 'viewer') as ManageMemberRole}
                    onChange={(value) =>
                      setInviteStates((prev) => ({
                        ...prev,
                        [group.id]: { email: prev[group.id]?.email ?? '', role: value },
                      }))
                    }
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleInvite(group.id)}
                      disabled={manageMember.isLoading || !canInviteMember}
                    >
                      {localize('com_ui_add')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
            {!groups?.length && (
              <p className="text-sm text-text-secondary">{localize('com_admin_groups_empty')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
