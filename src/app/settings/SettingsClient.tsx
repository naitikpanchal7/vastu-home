"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";

const SPECIALIZATIONS = [
  "Residential Vastu",
  "Commercial Vastu",
  "Industrial Vastu",
  "Interior Design",
  "Architecture",
  "Feng Shui",
  "Astrology Integration",
  "Vastu for Plots",
];

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

function parseSpecializations(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function SettingsClient({ profile }: Props) {
  const router  = useRouter();
  const supabase = createClient();

  // Profile fields
  const [fullName,       setFullName]       = useState(profile.full_name);
  const [phone,          setPhone]          = useState(profile.phone ?? "");
  const [city,           setCity]           = useState(profile.city ?? "");
  const [yearsExp,       setYearsExp]       = useState(String(profile.years_experience ?? ""));
  const [selectedSpecs,  setSelectedSpecs]  = useState<string[]>(parseSpecializations(profile.specialization));
  const [firmName,       setFirmName]       = useState(profile.firm_name ?? "");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [fieldErrors,   setFieldErrors]   = useState<Record<string, string>>({});

  // Report branding
  const [showBranding,  setShowBranding]  = useState(profile.report_show_branding);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved,  setBrandingSaved]  = useState(false);
  const [logoUrl,       setLogoUrl]       = useState<string | null>(profile.logo_url);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError,     setLogoError]     = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Password change
  const [currentPassword,  setCurrentPassword]  = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [showCurrentPw,    setShowCurrentPw]    = useState(false);
  const [showNewPw,        setShowNewPw]        = useState(false);
  const [showConfirmPw,    setShowConfirmPw]    = useState(false);
  const [passwordSaving,   setPasswordSaving]   = useState(false);
  const [passwordSaved,    setPasswordSaved]    = useState(false);
  const [passwordError,    setPasswordError]    = useState<string | null>(null);

  // Sign out confirmation
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // ── Validation ───────────────────────────────────────────────
  function validatePhone(v: string): string | null {
    if (!v.trim()) return null;
    const cleaned = v.replace(/[\s\-()]/g, "");
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleaned))
      return "Enter a valid Indian mobile number (e.g. +91 98765 43210)";
    return null;
  }

  function validateYearsExp(v: string): string | null {
    if (!v.trim()) return null;
    const n = parseInt(v);
    if (isNaN(n) || n < 0 || n > 99) return "Must be between 0 and 99";
    return null;
  }

  function validateProfileFields(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Full name is required";
    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.phone = phoneErr;
    const yearsErr = validateYearsExp(yearsExp);
    if (yearsErr) errors.yearsExp = yearsErr;
    return errors;
  }

  // ── Profile Save ─────────────────────────────────────────────
  async function handleProfileSave() {
    const errors = validateProfileFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("profiles")
      .update({
        full_name:        fullName.trim(),
        phone:            phone.trim() || null,
        city:             city.trim() || null,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        specialization:   selectedSpecs.join(", ") || null,
        firm_name:        firmName.trim() || null,
      })
      .eq("id", profile.id);

    if (err) {
      setProfileError(err.message);
    } else {
      setProfileSaved(true);
      router.refresh();
      setTimeout(() => setProfileSaved(false), 3000);
    }
    setProfileSaving(false);
  }

  // ── Branding Save ────────────────────────────────────────────
  async function handleBrandingSave() {
    setBrandingSaving(true);
    setBrandingSaved(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("profiles")
      .update({ report_show_branding: showBranding })
      .eq("id", profile.id);

    if (!err) {
      setBrandingSaved(true);
      router.refresh();
      setTimeout(() => setBrandingSaved(false), 3000);
    }
    setBrandingSaving(false);
  }

  // ── Password Change ──────────────────────────────────────────
  async function handlePasswordChange() {
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);

    // Re-authenticate to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (signInErr) {
      setPasswordError("Current password is incorrect.");
      setPasswordSaving(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });

    if (updateErr) {
      setPasswordError(updateErr.message);
    } else {
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 4000);
    }
    setPasswordSaving(false);
  }

  // ── Sign Out ─────────────────────────────────────────────────
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // ── Logo Handlers ────────────────────────────────────────────
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
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profiles/logo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setLogoUrl(json.data.url);
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
      const res = await fetch("/api/profiles/logo", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Remove failed.");
      setLogoUrl(null);
      router.refresh();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  function toggleSpec(spec: string) {
    setSelectedSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  }

  return (
    <AppShell>
      <Topbar
        title="Settings"
        subtitle="Manage your profile and preferences"
      />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <div className="max-w-[640px] flex flex-col gap-[14px]">

          {/* ── Profile ── */}
          <Section title="Profile" icon="◎">
            <div className="flex flex-col gap-[10px]">
              {profileError && <ErrorBanner message={profileError} />}

              <div className="grid grid-cols-2 gap-[9px]">
                <Field label="Full Name" span={2} error={fieldErrors.fullName}>
                  <Input value={fullName} onChange={setFullName} placeholder="Your full name" hasError={!!fieldErrors.fullName} />
                </Field>
                <Field label="Email Address" span={2}>
                  <Input value={profile.email} onChange={() => {}} disabled placeholder="Email" />
                  <p className="text-[9px] text-vastu-text-3 mt-[4px]">Contact support to change your email address</p>
                </Field>
                <Field label="Phone Number" error={fieldErrors.phone}>
                  <Input value={phone} onChange={setPhone} placeholder="+91 98765 43210" hasError={!!fieldErrors.phone} />
                </Field>
                <Field label="City">
                  <Input value={city} onChange={setCity} placeholder="Mumbai, Delhi…" />
                </Field>
                <Field label="Years of Experience" error={fieldErrors.yearsExp}>
                  <Input
                    type="number"
                    value={yearsExp}
                    onChange={setYearsExp}
                    placeholder="e.g. 8"
                    min="0"
                    max="99"
                    hasError={!!fieldErrors.yearsExp}
                  />
                </Field>
                <Field label="Firm / Practice Name">
                  <Input value={firmName} onChange={setFirmName} placeholder="e.g. Sharma Vastu Consultancy" />
                </Field>
                <Field label="Specialization" span={2}>
                  <div className="flex flex-wrap gap-[6px] mt-[4px]">
                    {SPECIALIZATIONS.map((spec) => {
                      const active = selectedSpecs.includes(spec);
                      return (
                        <button
                          key={spec}
                          onClick={() => toggleSpec(spec)}
                          className={`px-[10px] py-[4px] rounded-full text-[10px] font-sans border transition-all ${
                            active
                              ? "bg-[rgba(200,175,120,0.12)] border-gold text-gold"
                              : "bg-transparent border-[rgba(200,175,120,0.18)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2"
                          }`}
                        >
                          {active && <span className="mr-[4px] text-[9px]">✓</span>}
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSpecs.length === 0 && (
                    <p className="text-[9px] text-vastu-text-3 mt-[6px]">Select one or more areas of specialization</p>
                  )}
                </Field>
              </div>

              <div className="flex justify-end pt-[4px]">
                <SaveButton onClick={handleProfileSave} saving={profileSaving} saved={profileSaved} />
              </div>
            </div>
          </Section>

          {/* ── Report Branding ── */}
          <Section title="Report Branding" icon="◌">
            <div className="flex flex-col gap-[9px]">
              <div className="py-[4px]">
                <div className="text-[11px] text-vastu-text font-medium mb-[2px]">Company Logo</div>
                <div className="text-[10px] text-vastu-text-3 mb-[10px]">
                  Appears on the cover page of PDF reports. PNG, JPG or SVG, max 1 MB.
                </div>

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
                      <img src={logoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
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

              <div className="flex items-center justify-between py-[4px]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Show vastu@home branding</div>
                  <div className="text-[10px] text-vastu-text-3 mt-[2px]">
                    Adds &quot;Prepared using vastu@home&quot; to PDF reports
                  </div>
                </div>
                <button
                  onClick={() => setShowBranding((v) => !v)}
                  className={`w-[38px] h-[20px] rounded-full transition-colors duration-150 flex items-center px-[2px] ${
                    showBranding ? "bg-gold" : "bg-bg-4"
                  }`}
                >
                  <span
                    className={`w-[16px] h-[16px] rounded-full bg-[#faf7f0] shadow transition-transform duration-150 ${
                      showBranding ? "translate-x-[18px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end pt-[4px]">
                <SaveButton onClick={handleBrandingSave} saving={brandingSaving} saved={brandingSaved} />
              </div>
            </div>
          </Section>

          {/* ── Security ── */}
          <Section title="Security" icon="◉">
            <div className="flex flex-col gap-[10px]">
              <p className="text-[10px] text-vastu-text-3">
                Change your account password. You&apos;ll need to confirm your current password first.
              </p>

              {passwordError && <ErrorBanner message={passwordError} />}
              {passwordSaved && (
                <SuccessBanner message="Password updated successfully." />
              )}

              <Field label="Current Password">
                <PasswordInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                  show={showCurrentPw}
                  onToggle={() => setShowCurrentPw((v) => !v)}
                />
              </Field>
              <Field label="New Password">
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 8 characters"
                  show={showNewPw}
                  onToggle={() => setShowNewPw((v) => !v)}
                />
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-[9px] text-[#b43218] mt-[4px]">Must be at least 8 characters</p>
                )}
              </Field>
              <Field label="Confirm New Password">
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat new password"
                  show={showConfirmPw}
                  onToggle={() => setShowConfirmPw((v) => !v)}
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-[9px] text-[#b43218] mt-[4px]">Passwords do not match</p>
                )}
              </Field>

              <div className="flex justify-end pt-[4px]">
                <SaveButton
                  onClick={handlePasswordChange}
                  saving={passwordSaving}
                  saved={passwordSaved}
                  label="Update Password"
                  savedLabel="Password Updated"
                />
              </div>
            </div>
          </Section>

          {/* ── Account ── */}
          <Section title="Account" icon="⚙">
            <div className="flex flex-col gap-[4px]">
              <div className="flex items-center justify-between py-[8px] border-b border-[rgba(100,70,20,0.08)]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Email address</div>
                  <div className="font-mono text-[11px] text-vastu-text-3 mt-[2px]">{profile.email}</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-[8px]">
                <div>
                  <div className="text-[11px] text-vastu-text font-medium">Sign out</div>
                  <div className="text-[10px] text-vastu-text-3 mt-[2px]">
                    Sign out of your account on this device
                  </div>
                </div>

                {showSignOutConfirm ? (
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[10px] text-vastu-text-3">Are you sure?</span>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-[5px] bg-[rgba(180,50,30,0.10)] border border-[rgba(180,50,30,0.30)] text-[#b43218] font-sans text-[11px] rounded-md hover:bg-[rgba(180,50,30,0.18)] transition-colors"
                    >
                      Yes, sign out
                    </button>
                    <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="px-3 py-[5px] bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    className="px-3 py-[5px] bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Section({ title, icon, children }: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
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

function Field({ label, children, span, error }: {
  label: string;
  children: React.ReactNode;
  span?: number;
  error?: string;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-[9px] text-[#b43218] mt-[4px]">{error}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, disabled, type = "text", min, max, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  min?: string;
  max?: string;
  hasError?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={`w-full px-[9px] py-[6px] bg-bg-2 border rounded-[5px] text-vastu-text font-sans text-[12px] outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        hasError
          ? "border-[rgba(180,50,30,0.45)] focus:border-[rgba(180,50,30,0.7)]"
          : "border-[rgba(100,70,20,0.20)] focus:border-gold-3"
      }`}
    />
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-[9px] py-[6px] pr-[40px] bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3 transition-colors"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-[9px] top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.5px] text-vastu-text-3 hover:text-vastu-text-2 transition-colors font-sans"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function SaveButton({ onClick, saving, saved, label = "Save Changes", savedLabel = "Saved" }: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
  label?: string;
  savedLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`px-3 py-[5px] font-sans font-medium text-[11px] rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        saved
          ? "bg-[rgba(50,180,100,0.12)] border border-[rgba(50,180,100,0.28)] text-[#3abf74]"
          : "bg-gold text-bg hover:bg-gold-2"
      }`}
    >
      {saving ? "Saving…" : saved ? `✓ ${savedLabel}` : label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-3 py-[9px] bg-[rgba(180,50,30,0.08)] border border-[rgba(180,50,30,0.25)] rounded-[7px] text-[11px] text-[#b43218]">
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="px-3 py-[9px] bg-[rgba(50,180,100,0.08)] border border-[rgba(50,180,100,0.25)] rounded-[7px] text-[11px] text-[#3abf74]">
      {message}
    </div>
  );
}
