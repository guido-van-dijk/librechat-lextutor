import { Navigate } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import BrandingSettings from '~/components/Nav/SettingsTabs/Admin/Branding';
import GroupsSettings from '~/components/Nav/SettingsTabs/Admin/Groups';

export default function AdminConsole() {
  const { user } = useAuthContext();
  const localize = useLocalize();

  if (!user) {
    return null;
  }

  if (user.role !== SystemRoles.ADMIN) {
    return <Navigate to="/c/new" replace />;
  }

  return (
    <div className="h-full overflow-auto bg-background px-4 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header>
          <p className="text-xs uppercase tracking-wide text-text-secondary">
            {localize('com_admin_console_label')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">
            {localize('com_admin_console_title')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            {localize('com_admin_console_description')}
          </p>
        </header>

        <section className="rounded-2xl border border-border-medium bg-surface-primary p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              {localize('com_admin_console_branding')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {localize('com_admin_console_branding_description')}
            </p>
          </div>
          <BrandingSettings />
        </section>

        <section className="rounded-2xl border border-border-medium bg-surface-primary p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              {localize('com_admin_console_groups')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {localize('com_admin_console_groups_description')}
            </p>
          </div>
          <GroupsSettings />
        </section>
      </div>
    </div>
  );
}
