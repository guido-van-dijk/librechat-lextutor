import React, { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SelectDropDown, Spinner } from '@librechat/client';
import type { AgentForm } from '~/common';
import { useProjectsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

export default function ProjectSelector() {
  const localize = useLocalize();
  const { control } = useFormContext<AgentForm>();
  const { data: projects = [], isLoading } = useProjectsQuery();

  const placeholder = localize('com_nav_projects_none') ?? 'No project';
  const emptyTitle = localize('com_nav_projects') ?? 'Project';

  const options = useMemo(() => {
    return [
      {
        label: placeholder,
        value: '',
      },
      ...projects.map((project) => ({
        label: project.name,
        value: project.id,
        icon: (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: project.color ?? '#3b82f6' }}
          />
        ),
      })),
    ];
  }, [projects, placeholder]);

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center gap-2 text-token-text-secondary">
        <Spinner size="xs" />
        <span>{localize('com_ui_loading')}</span>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium text-token-text-primary">
        {emptyTitle}
      </p>
      <Controller
        name="projectIds"
        control={control}
        defaultValue={[]}
        render={({ field }) => {
          const currentValue =
            Array.isArray(field.value) && field.value.length > 0 ? field.value[0] : '';
          return (
            <SelectDropDown
              value={currentValue || null}
              setValue={(value) => {
                let projectId = '';
                if (typeof value === 'string') {
                  projectId = value;
                } else if (value && typeof value === 'object' && 'value' in value) {
                  projectId = value.value ?? '';
                }
                if (!projectId) {
                  field.onChange([]);
                  return;
                }
                field.onChange([projectId]);
              }}
              availableValues={options}
              emptyTitle={true}
              placeholder={placeholder}
              showLabel={false}
              containerClassName="w-full"
            />
          );
        }}
      />
    </div>
  );
}
