import React from 'react';
import { Tag } from 'lucide-react';
import {
  Button,
  Input,
  OGDialog,
  OGDialogTitle,
  OGDialogContent,
  OGDialogTrigger,
  TextareaAutosize,
  useToastContext,
} from '@librechat/client';
import { SystemRoles, type TMarketplaceCategory } from 'librechat-data-provider';
import {
  useGetAgentCategoriesQuery,
  useCreateAgentCategoryMutation,
  useUpdateAgentCategoryMutation,
  useDeleteAgentCategoryMutation,
} from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import type { TranslationKeys } from '~/hooks';

type CategoryFormState = {
  value: string;
  label: string;
  description: string;
};

const initialForm: CategoryFormState = {
  value: '',
  label: '',
  description: '',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

const isSystemCategory = (category: TMarketplaceCategory) =>
  category.value === 'promoted' || category.value === 'all';

const CategoryManager: React.FC = () => {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const [form, setForm] = React.useState<CategoryFormState>(initialForm);
  const [editingValue, setEditingValue] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const categoriesQuery = useGetAgentCategoriesQuery({
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleError = (error: unknown, fallback: string) => {
    const message =
      (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
        ?.message ||
      (error as { message?: string })?.message ||
      fallback;
    showToast({ status: 'error', message });
  };

  const { mutate: createCategory, isLoading: isCreating } = useCreateAgentCategoryMutation({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_agents_categories_saved') });
      setForm(initialForm);
    },
    onError: (error) => handleError(error, localize('com_agents_categories_error')),
  });

  const { mutate: updateCategory, isLoading: isUpdating } = useUpdateAgentCategoryMutation({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_agents_categories_saved') });
      setForm(initialForm);
      setEditingValue(null);
    },
    onError: (error) => handleError(error, localize('com_agents_categories_error')),
  });

  const { mutate: deleteCategory, isLoading: isDeleting } = useDeleteAgentCategoryMutation({
    onSuccess: () => {
      showToast({ status: 'success', message: localize('com_agents_categories_deleted') });
      if (editingValue && editingValue === pendingDelete) {
        setForm(initialForm);
        setEditingValue(null);
      }
    },
    onError: (error) => handleError(error, localize('com_agents_categories_error')),
    onSettled: () => setPendingDelete(null),
  });

  const handleLabelChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      label: value,
      value: editingValue || prev.value ? prev.value : slugify(value),
    }));
  };

  const handleValueChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      value: slugify(value),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingValue(null);
  };

  const handleEdit = (category: TMarketplaceCategory) => {
    setEditingValue(category.value);
    setForm({
      value: category.value,
      label: category.label,
      description: category.description || '',
    });
  };

  const handleDelete = (category: TMarketplaceCategory) => {
    if (!category.custom) {
      return;
    }

    const confirmation = window.confirm(
      localize('com_agents_categories_delete_confirm', {
        category: category.label?.startsWith('com_')
          ? localize(category.label as TranslationKeys)
          : category.label,
      }),
    );

    if (!confirmation) {
      return;
    }

    setPendingDelete(category.value);
    deleteCategory({ value: category.value });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.value || !form.label) {
      return;
    }

    const payload = {
      label: form.label.trim(),
      description: form.description.trim() || undefined,
    };

    if (editingValue) {
      updateCategory({ value: editingValue, data: payload });
      return;
    }

    createCategory({
      value: form.value,
      label: payload.label,
      description: payload.description,
    });
  };

  const managedCategories = React.useMemo(
    () =>
      (categoriesQuery.data || [])
        .filter((category) => !isSystemCategory(category))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categoriesQuery.data],
  );

  const getDisplayName = (category: TMarketplaceCategory) =>
    category.label?.startsWith('com_')
      ? localize(category.label as TranslationKeys)
      : category.label;

  const getDescription = (category: TMarketplaceCategory) =>
    category.description?.startsWith('com_')
      ? localize(category.description as TranslationKeys)
      : category.description || '';

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  const isSubmitting = isCreating || isUpdating;

  return (
    <OGDialog>
      <OGDialogTrigger asChild>
        <Button
          variant="outline"
          className="relative h-12 rounded-xl border-border-medium font-medium"
          aria-label={localize('com_agents_categories_manage')}
        >
          <Tag className="mr-2 h-4 w-4" aria-hidden="true" />
          {localize('com_agents_categories_manage')}
        </Button>
      </OGDialogTrigger>
      <OGDialogContent className="w-11/12 max-w-2xl border-border-light bg-surface-primary text-text-primary">
        <OGDialogTitle>{localize('com_agents_categories_manage')}</OGDialogTitle>
        <div className="space-y-6 py-2">
          <p className="text-sm text-text-secondary">
            {localize('com_agents_categories_custom_only')}
          </p>
          <div className="rounded-lg border border-border-light">
            {categoriesQuery.isLoading ? (
              <div className="p-4 text-sm text-text-secondary">
                {localize('com_ui_loading')}
              </div>
            ) : managedCategories.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">
                {localize('com_agents_categories_none')}
              </div>
            ) : (
              <ul>
                {managedCategories.map((category) => (
                  <li
                    key={category.value}
                    className="flex flex-col gap-2 border-b border-border-subtle px-4 py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary">{getDisplayName(category)}</p>
                        <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
                          {category.count ?? 0}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary">{category.value}</p>
                      {getDescription(category) && (
                        <p className="text-sm text-text-secondary">{getDescription(category)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                        {localize('com_ui_edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          !category.custom ||
                          (category.count ?? 0) > 0 ||
                          pendingDelete === category.value ||
                          isDeleting
                        }
                        onClick={() => handleDelete(category)}
                      >
                        {localize('com_ui_delete')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              {editingValue
                ? localize('com_agents_categories_edit_title')
                : localize('com_agents_categories_form_title')}
            </h3>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">
                {localize('com_agents_categories_label')}
              </label>
              <Input
                value={form.label}
                onChange={(event) => handleLabelChange(event.target.value)}
                placeholder={localize('com_agents_categories_label_placeholder')}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">
                {localize('com_agents_categories_value')}
              </label>
              <Input
                value={form.value}
                onChange={(event) => handleValueChange(event.target.value)}
                placeholder={localize('com_agents_categories_value_placeholder')}
                required
                disabled={Boolean(editingValue)}
              />
              {!editingValue && (
                <p className="text-xs text-text-tertiary">
                  {localize('com_agents_categories_value_hint')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">
                {localize('com_agents_categories_description')}
              </label>
              <TextareaAutosize
                minRows={2}
                className="w-full resize-none rounded-md border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary"
                value={form.description}
                onChange={(event) => handleDescriptionChange(event.target.value)}
                placeholder={localize('com_agents_categories_description_placeholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {editingValue
                  ? localize('com_agents_categories_update')
                  : localize('com_agents_categories_create')}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                {localize('com_agents_categories_reset')}
              </Button>
            </div>
          </form>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
};

export default CategoryManager;
