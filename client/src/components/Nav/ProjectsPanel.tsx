import { useState, useCallback, FormEvent } from 'react';
import { Plus, Trash2, Loader2, Pen } from 'lucide-react';
import { Button, Input, useToastContext } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from '~/data-provider';
import { cn } from '~/utils';

type FilterValue = string;

interface ProjectsPanelProps {
  projects: TProject[];
  activeProjectId: FilterValue;
  onSelect: (value: FilterValue) => void;
  isLoading?: boolean;
}

const BASE_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'Alle chats' },
  { value: 'none', label: 'Zonder project' },
];

export default function ProjectsPanel({
  projects,
  activeProjectId,
  onSelect,
  isLoading,
}: ProjectsPanelProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const createProject = useCreateProjectMutation();
  const updateProject = useUpdateProjectMutation();
  const deleteProject = useDeleteProjectMutation();

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      try {
        const project = await createProject.mutateAsync({ name: trimmed });
        setName('');
        setIsAdding(false);
        onSelect(project.id);
      } catch (error) {
        showToast({
          message: localize('com_ui_error') || 'Er is iets misgegaan',
          variant: 'danger',
        });
      }
    },
    [name, createProject, localize, onSelect, showToast],
  );

  const handleDelete = useCallback(
    async (project: TProject) => {
      const confirmed = window.confirm(
        localize('com_nav_projects_delete_confirm') ||
          'Weet je zeker dat je dit project wilt verwijderen?',
      );
      if (!confirmed) {
        return;
      }
      try {
        await deleteProject.mutateAsync(project.id);
        if (activeProjectId === project.id) {
          onSelect('all');
        }
      } catch (error) {
        showToast({
          message: localize('com_ui_error') || 'Er is iets misgegaan',
          variant: 'danger',
        });
      }
    },
    [deleteProject, activeProjectId, onSelect, localize, showToast],
  );

  const handleRename = useCallback(
    async (project: TProject) => {
      const newName = prompt(localize('com_nav_projects_rename') || 'Nieuwe projectnaam', project.name);
      if (!newName) {
        return;
      }
      try {
        await updateProject.mutateAsync({
          projectId: project.id,
          payload: { name: newName },
        });
      } catch (error) {
        showToast({
          message: localize('com_ui_error') || 'Er is iets misgegaan',
          variant: 'danger',
        });
      }
    },
    [localize, showToast, updateProject],
  );

  const renderButton = (value: FilterValue, label: string, accent?: string) => {
    const isActive = activeProjectId === value;
    return (
      <button
        key={value}
        onClick={() => onSelect(value)}
        className={cn(
          'group flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors',
          isActive ? 'bg-surface-active text-text-primary' : 'text-text-secondary hover:bg-surface-hover',
        )}
      >
        <span className="flex items-center gap-2">
          {accent && <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />}
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-text-secondary">
        <span>{localize('com_nav_projects') || 'Projecten'}</span>
        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="rounded-full p-1 text-text-secondary transition hover:bg-surface-hover"
          aria-label={localize('com_nav_new_project') || 'Nieuw project'}
        >
          <Plus className="size-4" />
        </button>
      </div>
      {isAdding && (
        <form className="mb-2 flex gap-2" onSubmit={handleCreate}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={localize('com_nav_project_name_placeholder') || 'Naam project'}
            className="flex-1"
          />
          <Button type="submit" disabled={createProject.isLoading}>
            {createProject.isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Opslaan'}
          </Button>
        </form>
      )}
      <div className="space-y-1">
        {BASE_OPTIONS.map((option) => renderButton(option.value, option.label))}
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-text-secondary">
            <Loader2 className="size-4 animate-spin" />
            {localize('com_ui_loading')}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-md px-2 py-1 text-xs text-text-secondary">
            {localize('com_nav_projects_empty') || 'Nog geen projecten'}
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="group flex items-center">
              <div className="flex-1">
                {renderButton(project.id, project.name, project.color)}
              </div>
              <div className="ml-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(project);
                  }}
                  className="rounded-full p-1 text-text-secondary hover:bg-surface-hover"
                  aria-label={localize('com_nav_projects_rename') || 'Hernoem project'}
                >
                  <Pen className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project);
                  }}
                  className="rounded-full p-1 text-xs text-text-secondary hover:bg-surface-hover"
                  aria-label={localize('com_nav_projects_delete') || 'Verwijder project'}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
