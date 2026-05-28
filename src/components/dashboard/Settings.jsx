import React, { useMemo, useState, useEffect } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useStore } from "../../lib/store";
import { getEnvironmentConfig } from "../../lib/config";
import { 
  loadNetworkProfiles, 
  saveNetworkProfile, 
  deleteNetworkProfile,
  setActiveProfile 
} from "../../lib/userPreferences";
import { 
  validateHorizonUrl, 
  validateSorobanUrl, 
  validateNetworkPassphrase 
} from "../../lib/validation";

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div style={{ 
      fontSize: "11px", 
      color: "var(--error)", 
      marginTop: "4px",
      padding: "6px 8px",
      background: "rgba(255, 0, 0, 0.1)",
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--error)"
    }}>
      {message}
    </div>
  );
}

export default function Settings() {
  const initialCustomHeaders = getCustomNetworkAuthHeaders();
  const initialHeaderName = Object.keys(initialCustomHeaders)[0] || "Authorization";
  const { network, setNetwork, theme, toggleTheme } = useStore();
  const {
    profiles,
    activeProfile,
    activeProfileName,
    setActiveProfile: setConfigProfile,
    saveProfile,
    deleteProfile,
    preferences,
    setPreference,
  } = useSettings();

  // Custom network profile state (Issue #188)
  const [customProfiles, setCustomProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [horizonUrl, setHorizonUrl] = useState("");
  const [sorobanUrl, setSorobanUrl] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [draftConfig, setDraftConfig] = useState(() => activeProfile.config);
  const [configProfileName, setConfigProfileName] = useState("");

  const baseline = useMemo(() => getEnvironmentConfig(), []);

  // Load custom profiles on mount
  useEffect(() => {
    loadNetworkProfiles().then(setCustomProfiles);
  }, []);

  function handleSaveConfigProfile() {
    const name = configProfileName.trim() || activeProfileName;
    saveProfile(name, draftConfig);
    setConfigProfileName("");
  }

  // Custom network profile handlers (Issue #188)
  async function handleSaveNetworkProfile() {
    const errors = {};
    
    // Validate inputs
    const horizonVal = validateHorizonUrl(horizonUrl.trim());
    if (!horizonVal.valid) errors.horizonUrl = horizonVal.errors[0];
    
    const sorobanVal = validateSorobanUrl(sorobanUrl.trim(), false);
    if (!sorobanVal.valid) errors.sorobanUrl = sorobanVal.errors[0];
    
    const passphraseVal = validateNetworkPassphrase(passphrase.trim(), true);
    if (!passphraseVal.valid) errors.passphrase = passphraseVal.errors[0];
    
    if (!profileName.trim()) {
      errors.profileName = "Profile name is required";
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      const saved = await saveNetworkProfile({
        id: selectedProfileId,
        name: profileName.trim(),
        horizonUrl: horizonUrl.trim(),
        sorobanUrl: sorobanUrl.trim() || undefined,
        passphrase: passphrase.trim(),
      });
      
      // Reload profiles
      const updated = await loadNetworkProfiles();
      setCustomProfiles(updated);
      
      // Reset form
      setProfileName("");
      setHorizonUrl("");
      setSorobanUrl("");
      setPassphrase("");
      setSelectedProfileId(null);
      setValidationErrors({});
    } catch (err) {
      setValidationErrors({ submit: err.message });
    }
  }

  async function handleDeleteNetworkProfile(profileId) {
    try {
      await deleteNetworkProfile(profileId);
      const updated = await loadNetworkProfiles();
      setCustomProfiles(updated);
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
        setProfileName("");
        setHorizonUrl("");
        setSorobanUrl("");
        setPassphrase("");
      }
    } catch (err) {
      setValidationErrors({ delete: err.message });
    }
  }

  function handleSelectProfile(profile) {
    setSelectedProfileId(profile.id);
    setProfileName(profile.name);
    setHorizonUrl(profile.horizonUrl);
    setSorobanUrl(profile.sorobanUrl || "");
    setPassphrase(profile.passphrase);
    setValidationErrors({});
  }

  function handleClearForm() {
    setSelectedProfileId(null);
    setProfileName("");
    setHorizonUrl("");
    setSorobanUrl("");
    setPassphrase("");
    setValidationErrors({});
  }

  async function handleSwitchProfile(profileId) {
    try {
      await setActiveProfile(profileId);
      // In a real app, this would trigger a re-render via a hook
      // For now, we'll just show a success message
      alert("Profile switched successfully!");
    } catch (err) {
      setValidationErrors({ switch: err.message });
    }
  }

  function updateCustomHeader(name, value) {
    setCustomHeaderName(name);
    setCustomHeaderValue(value);
    updateCustomNetworkConfig({
      headers: name.trim() && value.trim() ? { [name.trim()]: value.trim() } : {},
    });
  }

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700 }}>
        Settings
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px" }}>
          <FieldLabel>Environment</FieldLabel>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
            Baseline: {baseline.environment}
          </div>
          <FieldLabel>Network</FieldLabel>
          <select
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <option value="testnet">testnet</option>
            <option value="mainnet">mainnet</option>
            <option value="futurenet">futurenet</option>
            <option value="local">local</option>
            <option value="custom">custom</option>
          </select>
          <button
            onClick={toggleTheme}
            style={{
              marginTop: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              padding: "8px 10px",
            }}
          >
            Toggle Theme ({theme})
          </button>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px" }}>
          <FieldLabel>Preferences</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(preferences).map(([key, value]) => {
              if (typeof value !== "boolean") return null;
              return (
                <label key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span>{key}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(event) => setPreference(key, event.target.checked)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <FieldLabel>Configuration Profiles</FieldLabel>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={activeProfileName}
            onChange={(event) => {
              setConfigProfile(event.target.value);
              const selected = profiles.find((profile) => profile.name === event.target.value);
              setDraftConfig(selected?.config || getEnvironmentConfig());
            }}
            style={{
              minWidth: "220px",
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            {profiles.map((profile) => (
              <option key={profile.name} value={profile.name}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => deleteProfile(activeProfileName)}
            disabled={activeProfileName === "default"}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            Delete
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Refresh Interval (ms)
            <input
              type="number"
              value={draftConfig.refreshIntervalMs}
              onChange={(event) => setDraftConfig((prev) => ({ ...prev, refreshIntervalMs: Number(event.target.value) }))}
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            Max Results
            <input
              type="number"
              value={draftConfig.maxResults}
              onChange={(event) => setDraftConfig((prev) => ({ ...prev, maxResults: Number(event.target.value) }))}
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={configProfileName}
            onChange={(event) => setConfigProfileName(event.target.value)}
            placeholder="Profile name"
            style={{
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              width: "200px",
              fontSize: "12px",
            }}
          />
          <button
            onClick={handleSaveConfigProfile}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--cyan-dim)",
              background: "var(--cyan-glow)",
              color: "var(--cyan)",
              fontSize: "12px",
            }}
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* Custom Network Profiles Section (Issue #188) */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <FieldLabel>Custom Network Profiles</FieldLabel>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Save and manage multiple Horizon/RPC endpoint presets
        </div>

        {customProfiles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Saved Profiles
            </div>
            {customProfiles.map((profile) => (
              <div
                key={profile.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {profile.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {profile.horizonUrl}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleSelectProfile(profile)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-hover)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteNetworkProfile(profile.id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--error)",
                      background: "rgba(255, 0, 0, 0.1)",
                      color: "var(--error)",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleSwitchProfile(profile.id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--cyan-dim)",
                      background: "var(--cyan-glow)",
                      color: "var(--cyan)",
                      cursor: "pointer",
                    }}
                  >
                    Switch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {selectedProfileId ? "Edit Profile" : "Add New Profile"}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>Profile Name *</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                setValidationErrors({ ...validationErrors, profileName: "" });
              }}
              placeholder="e.g., Private Testnet, Local Dev"
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <ErrorMessage message={validationErrors.profileName} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>Horizon URL *</span>
            <input
              type="text"
              value={horizonUrl}
              onChange={(e) => {
                setHorizonUrl(e.target.value);
                setValidationErrors({ ...validationErrors, horizonUrl: "" });
              }}
              placeholder="https://horizon.stellar.org"
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            />
            <ErrorMessage message={validationErrors.horizonUrl} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>Soroban RPC URL (optional)</span>
            <input
              type="text"
              value={sorobanUrl}
              onChange={(e) => {
                setSorobanUrl(e.target.value);
                setValidationErrors({ ...validationErrors, sorobanUrl: "" });
              }}
              placeholder="https://soroban-rpc.stellar.org"
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            />
            <ErrorMessage message={validationErrors.sorobanUrl} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>Network Passphrase *</span>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setValidationErrors({ ...validationErrors, passphrase: "" });
              }}
              placeholder="Public Global Stellar Network ; September 2015"
              style={{
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            />
            <ErrorMessage message={validationErrors.passphrase} />
          </label>

          <ErrorMessage message={validationErrors.submit || validationErrors.delete || validationErrors.switch} />

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSaveNetworkProfile}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--cyan-dim)",
                background: "var(--cyan-glow)",
                color: "var(--cyan)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {selectedProfileId ? "Update Profile" : "Save Profile"}
            </button>
            {selectedProfileId && (
              <button
                onClick={handleClearForm}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
