import BrandingSettings from './Branding';
import GroupsSettings from './Groups';

export default function AdminSettings() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <BrandingSettings />
      </section>
      <section>
        <GroupsSettings />
      </section>
    </div>
  );
}
