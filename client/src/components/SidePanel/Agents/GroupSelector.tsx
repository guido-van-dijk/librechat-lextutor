import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox, Spinner } from '@librechat/client';
import type { AgentForm } from '~/common';
import { useGroupsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

export default function GroupSelector() {
  const localize = useLocalize();
  const { control } = useFormContext<AgentForm>();
  const { data: groups = [], isLoading } = useGroupsQuery();

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center gap-2 text-token-text-secondary">
        <Spinner size="xs" />
        <span>{localize('com_ui_loading')}</span>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="mb-4 text-sm text-token-text-secondary">
        {localize('com_ui_no_results_found')}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium text-token-text-primary">
        {localize('com_ui_share_groups_quick_add')}
      </p>
      <Controller
        name="groupIds"
        control={control}
        defaultValue={[]}
        render={({ field }) => {
          const selected = Array.isArray(field.value) ? field.value : [];

          const toggle = (groupId: string) => {
            const exists = selected.includes(groupId);
            const next = exists ? selected.filter((id) => id !== groupId) : [...selected, groupId];
            field.onChange(next);
          };

          return (
            <div className="space-y-2 rounded-md border border-border-light px-3 py-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(group.id)}
                    onCheckedChange={() => toggle(group.id)}
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}
