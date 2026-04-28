"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";

interface Props {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    years_experience: number | null;
    specialization: string | null;
    firm_name: string | null;
    report_show_branding: boolean;
    logo_url: string | null;
  };
}

export default function SettingsClient({ profile }: Props) {
  const router  = useRouter();
  const supabase = createClient();

  const [fullName,        setFullName]        = useState(profile.full_name);
  const [phone,           setPhone]           = useState(profile.phone ?? "");
  const [city,            setCity]            = useState(profile.city ?? "");
  const [yearsExp,        setYearsExp]        = useState(String(profile.years_experience ?? ""));
  const [specialization,  setSpecialization]  = useState(profile.specialization ?? "");
  const [firmName,        setFirmName]        = useState(profile.firm_name ?? "");
  const [showBranding,    setShowBranding]    = useState(profile.report_show_branding);
  const [logoUrl,         setLogoUrl]         = useState<string | null>(profile.logo_url);
  const [logoUploading,   setLogoUploading]   = useState(false);
  const [logoError,       setLogoError]       = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("profiles")
      .update({
        full_name:            fullName.trim(),
        phone:                phone.trim() || null,
        city:                 city.trim() || null,
        years_experience:     yearsExp ? parseInt(yearsExp) : null,
        specialization:       specialization.trim() || null,
        firm_name:            firmName.trim() || null,
        report_show_branding: showBranding,
      })
      .eq("id", profile.id);

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setLogoError("Please upload an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setLogoError("Logo must be under 1 MB.");
      return;
    }
    setLogoError(null);
    setLogoUploading(true);

    try {
      // Convert to base64 data URL and store directly in profiles — no storage bucket needed
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (supabase as any)
        .from("profiles")
        .update({ logo_url: dataUrl })
        .eq("id", profile.id);

      if (updateErr) throw updateErr;

      setLogoUrl(dataUrl);
      router.refresh();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    setLogoUploading(true);
    setLogoError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (supabase as any)
        .from("profiles")
        .update({ logo_url: null })
        .eq("id", profile.id);
      if (updateErr) throw updateErr;
      setLogoUrl(null);
      router.refresh();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <AppShell>
      <Topbar
        title="Settings"
        subtitle="Manage your profile and preferences"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-[5px] bg-gold text-bg font-sans font-medium text-[11px] rounded-md hover:bg-gold-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <div className="max-w-[640px] flex flex-col gap-[14px]">

          {error && (
            <div className="px-3 py-[9px] bg-[rgba(180,50,30,0.08)] border border-[rgba(180,50,30,0.25)] rounded-[7px] text-[11px] text-[#b43218]">
              {error}
            </div>
          )}

          {/* Profile */}
          <Section title="Profile" icon="◎">
            <div className="grid grid-cols-2 gap-[9px]">
              <Field label="Full Name" span={2}>
                <Input value={fullName} onChange={setFullName} placeholder="Your full name" />
              </Field>
              <Field label="Email">
                <Input value={profile.email} onChange={() => {}} disabled placeholder="Email" />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
              </Field>
              <Field label="City">
                <Input value={city} onChange={setCity} placeholder="Mumbai, Delhi…" />
              </Field>
              <Field label="Years of Experience">
                <Input type="number" value={yearsExp} onChange={setYearsExp} placeholder="e.g. 8" />
              </Field>
              <Field label="Specialization" span={2}>
                <Input value={specialization} onChange={setSpecialization} placeholder="e.g. Residential Vastu, Commercial spaces…" />
              </Field>
              <Field label="Firm / Practice Name" span={2}>
                <Input value={firmName} onChange={setFirmName} placeholder="e.g. Sharma Vastu Consultancy" />
              </Field>
            </div>
          </Section>

          {/* Report Branding */}
          <Section title="Report Branding" icon="◌">
            <div className="flex flex-col gap-[9px]">

              {/* Company Logo */}
              <div className="py-[6px]">
                <div className="text-[11px] text-vastu-text font-medium mb-[2px]">Company Logo</div>
                <div className="text-[10px] text-vastu-text-3 mb-[10px]">Appears on the cover page of PDF reports. PNG, JPG or SVG, max 2 MB.</div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                    e.currentTarget.value = "";
                  }}
                />

                {logoError && (
                  <div className="text-[10px] text-[#b43218] mb-[8px]">{logoError}</div>
                )}

                {logoUrl ? (
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[80px] h-[44px] rounded-[6px] border border-[rgba(100,70,20,0.20)] bg-bg-2 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-[7px]">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="px-3 py-[5px] bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors disabled:opacity-50"
                      >
                        {logoUploading ? "Uploading…" : "Replace"}
                      </button>
                      <button
                        onClick={() => void handleLogoRemove()}
                        disabled={logoUploading}
                        className="px-3 py-[5px] bg-transparent border border-[rgba(100,70,20,0.20)] text-[#b43218] font-sans text-[11px] rounded-md hover:border-[rgba(180,50,30,0.4)] transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-[8px] px-3 py-[8px] border border-dashed border-[rgba(100,70,20,0.25)] rounded-[7px] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2 transition-colors text-[11px] font-sans disabled:opacity-50 w-full"
                  >
                    <span className="text-[14px]">↑</span>
                    {logoUploading ? "Uploading…" : "Upload company logo"}
                  </button>
                )}
              </div>

              <div className="h-px bg-[rgba(100,70,20,0.10)]" />

              <div className="flex items-center justify-between py-[6px]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Show vastu@home branding</div>
                  <div className="text-[10px] text-vastu-text-3 mt-[2px]">Adds "Prepared using vastu@home" to PDF reports</div>
                </div>
                <button
                  onClick={() => setShowBranding((v) => !v)}
                  className={`w-[38px] h-[20px] rounded-full transition-colors duration-150 flex items-center px-[2px] ${showBranding ? "bg-gold" : "bg-bg-4"}`}
                >
                  <span className={`w-[16px] h-[16px] rounded-full bg-[#faf7f0] shadow transition-transform duration-150 ${showBranding ? "translate-x-[18px]" : "translate-x-0"}`} />
                </button>
              </div>

            </div>
          </Section>

          {/* Account */}
          <Section title="Account" icon="⚙">
            <div className="flex flex-col gap-[7px]">
              <div className="flex items-center justify-between py-[6px] border-b border-[rgba(100,70,20,0.08)]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Email address</div>
                  <div className="font-mono text-[11px] text-vastu-text-3 mt-[2px]">{profile.email}</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-[6px]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Sign out</div>
                  <div className="text-[10px] text-vastu-text-3 mt-[2px]">Sign out of your account on this device</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-[5px] bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[9px] overflow-hidden">
      <div className="px-4 py-[10px] border-b border-[rgba(100,70,20,0.12)] flex items-center gap-[7px]">
        <span className="text-[13px] text-gold-3">{icon}</span>
        <span className="font-serif text-[14px] text-vastu-text">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, disabled, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-[9px] py-[6px] bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    />
  );
}
