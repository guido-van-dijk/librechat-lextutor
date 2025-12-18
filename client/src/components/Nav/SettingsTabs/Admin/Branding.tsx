import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, Spinner, useToastContext } from '@librechat/client';
import { useBrandingQuery, useUpdateBrandingMutation, useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';

const MAX_LOGO_BYTES = 512 * 1024; // 500 KB

type BrandingFormState = {
  appTitle: string;
  helpUrl: string;
  customFooter: string;
  logoDataUri: string;
};

const defaultState: BrandingFormState = {
  appTitle: '',
  helpUrl: '',
  customFooter: '',
  logoDataUri: '',
};

export default function BrandingSettings() {
  const { data: branding, isLoading } = useBrandingQuery();
  const { data: startupConfig } = useGetStartupConfig();
  const updateBranding = useUpdateBrandingMutation();
  const { showToast } = useToastContext();
  const localize = useLocalize();
  const [formState, setFormState] = useState<BrandingFormState>(defaultState);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (branding) {
      setFormState({
        appTitle: branding.appTitle ?? '',
        helpUrl: branding.helpUrl ?? '',
        customFooter: branding.customFooter ?? '',
        logoDataUri: branding.logoDataUri ?? '',
      });
      setIsDirty(false);
    }
  }, [branding]);

  const logoPreview = useMemo(() => {
    if (formState.logoDataUri) {
      return formState.logoDataUri;
    }
    return startupConfig?.branding?.logo ?? '';
  }, [formState.logoDataUri, startupConfig?.branding?.logo]);

  const handleInputChange = (field: keyof BrandingFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast({
        message: localize('com_admin_branding_logo_too_large'),
        variant: 'danger',
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState((prev) => ({
        ...prev,
        logoDataUri: typeof reader.result === 'string' ? reader.result : '',
      }));
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setFormState((prev) => ({ ...prev, logoDataUri: '' }));
    setIsDirty(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateBranding.mutate(formState, {
      onSuccess: () => {
        showToast({
          message: localize('com_admin_branding_saved'),
          variant: 'success',
        });
        setIsDirty(false);
      },
      onError: () => {
        showToast({
          message: localize('com_ui_error'),
          variant: 'danger',
        });
      },
    });
  };

  const isSaving = updateBranding.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-text-secondary">
          {localize('com_admin_branding_description')}
        </p>
      </div>
      {isLoading && !branding ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="sm" />
          {localize('com_ui_loading')}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="branding-app-title">{localize('com_admin_branding_title')}</Label>
            <Input
              id="branding-app-title"
              value={formState.appTitle}
              onChange={handleInputChange('appTitle')}
              placeholder={localize('com_admin_branding_title')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="branding-help-url">{localize('com_admin_branding_help_url')}</Label>
            <Input
              id="branding-help-url"
              value={formState.helpUrl}
              onChange={handleInputChange('helpUrl')}
              placeholder="https://example.com/help"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="branding-custom-footer">
              {localize('com_admin_branding_custom_footer')}
            </Label>
            <textarea
              id="branding-custom-footer"
              className="min-h-[90px] rounded-md border border-border-medium bg-surface-primary p-2 text-sm text-text-primary"
              value={formState.customFooter}
              onChange={handleInputChange('customFooter')}
              placeholder="© Your company"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>{localize('com_admin_branding_logo')}</Label>
            {logoPreview ? (
              <div className="flex flex-col gap-2">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-border-medium bg-surface-secondary p-2">
                  <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={handleLogoRemove}>
                    {localize('com_admin_branding_remove_logo')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{localize('com_admin_branding_logo_hint')}</p>
            )}
            <Input type="file" accept="image/*" onChange={handleLogoChange} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={!isDirty || isSaving}>
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  {localize('com_ui_saving')}
                </div>
              ) : (
                localize('com_admin_branding_save')
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
