import React from 'react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { useGroupsQuery } from '~/data-provider';

export type AgentScopeState =
  | { scope: 'all' }
  | { scope: 'personal' }
  | { scope: 'public' }
  | { scope: 'group'; groupId: string };

type AgentScopeTabsProps = {
  value: AgentScopeState;
  onChange: (value: AgentScopeState) => void;
};

const buttonBase =
  'rounded-full border border-border-light px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap';

export default function AgentScopeTabs({ value, onChange }: AgentScopeTabsProps) {
  const localize = useLocalize();
  const { data: groups = [] } = useGroupsQuery();

  const isActive = (scope: AgentScopeState) => {
    if (scope.scope !== value.scope) {
      return false;
    }
    if (scope.scope === 'group') {
      return scope.groupId === value.groupId;
    }
    return true;
  };

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        className={cn(buttonBase, isActive({ scope: 'all' }) && 'bg-token-text-primary/10')}
        onClick={() => onChange({ scope: 'all' })}
      >
        {localize('com_ui_all_proper')}
      </button>
      <button
        type="button"
        className={cn(buttonBase, isActive({ scope: 'personal' }) && 'bg-token-text-primary/10')}
        onClick={() => onChange({ scope: 'personal' })}
      >
        {localize('com_nav_setting_account')}
      </button>
      <button
        type="button"
        className={cn(buttonBase, isActive({ scope: 'public' }) && 'bg-token-text-primary/10')}
        onClick={() => onChange({ scope: 'public' })}
      >
        {localize('com_ui_share_everyone')}
      </button>
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          className={cn(
            buttonBase,
            isActive({ scope: 'group', groupId: group.id }) && 'bg-token-text-primary/10',
          )}
          onClick={() => onChange({ scope: 'group', groupId: group.id })}
        >
          {group.name}
        </button>
      ))}
    </div>
  );
}
