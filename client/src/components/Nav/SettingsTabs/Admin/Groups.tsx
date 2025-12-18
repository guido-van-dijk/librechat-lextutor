import { useState } from 'react';
import { Button, Input, Label, SelectDropDown, Spinner, useToastContext } from '@librechat/client';
import {
  useGroupsQuery,
  useCreateGroupMutation,
  useManageGroupMemberMutation,
} from '~/data-provider';
import { useLocalize } from '~/hooks';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export default function GroupsSettings() {
  const { data: groups, isLoading } = useGroupsQuery();
  const createGroup = useCreateGroupMutation();
  const manageMember = useManageGroupMemberMutation();
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [inviteStates, setInviteStates] = useState<Record<
    string,
    { email: string; role: string }
  >>({});

  const handleCreateGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newGroup.name) {
      showToast({ message: localize('com_ui_name'), variant: 'danger' });
      return;
    }
    createGroup.mutate(
      { name: newGroup.name, description: newGroup.description },
      {
        onSuccess: () => {
          setNewGroup({ name: '', description: '' });
          showToast({ message: localize('com_admin_groups_created'), variant: 'success' });
        },
        onError: () => {
          showToast({ message: localize('com_ui_error'), variant: 'danger' });
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
          email: invite.email,
          role: (invite.role as 'owner' | 'editor' | 'viewer') || 'viewer',
        },
      },
      {
        onSuccess: () => {
          showToast({ message: localize('com_admin_groups_member_added'), variant: 'success' });
          setInviteStates((prev) => ({ ...prev, [groupId]: { email: '', role: 'viewer' } }));
        },
        onError: () => {
          showToast({ message: localize('com_ui_error'), variant: 'danger' });
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
        onError: () => showToast({ message: localize('com_ui_error'), variant: 'danger' }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          {localize('com_admin_groups_title')}
        </h3>
        <p className="text-sm text-text-secondary">{localize('com_admin_groups_description')}</p>
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-border-medium p-4" onSubmit={handleCreateGroup}>
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
          <Button type="submit" disabled={createGroup.isLoading}>
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
            {groups?.map((group) => (
              <div key={group.id} className="rounded-lg border border-border-medium p-4">
                <div className="flex flex-col gap-1">
                  <h5 className="text-base font-semibold text-text-primary">{group.name}</h5>
                  {group.description && (
                    <p className="text-sm text-text-secondary">{group.description}</p>
                  )}
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
                          className="flex items-center justify-between rounded-md bg-surface-secondary p-2"
                        >
                          <div>
                            <span className="font-medium text-text-primary">
                              {member.name || member.email}
                            </span>
                            <span className="ml-2 text-xs uppercase text-text-secondary">
                              {member.role}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(group.id, member.userId)}
                          >
                            {localize('com_ui_remove')}
                          </Button>
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
                  <SelectDropDown
                    value={inviteStates[group.id]?.role ?? 'viewer'}
                    onChange={(value) =>
                      setInviteStates((prev) => ({
                        ...prev,
                        [group.id]: { email: prev[group.id]?.email ?? '', role: value },
                      }))
                    }
                    options={roleOptions}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleInvite(group.id)}
                      disabled={manageMember.isLoading}
                    >
                      {localize('com_ui_add')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!groups?.length && (
              <p className="text-sm text-text-secondary">{localize('com_admin_groups_empty')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
