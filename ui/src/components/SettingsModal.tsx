import {
  Alert,
  Box,
  Button,
  ColumnLayout,
  FormField,
  Header,
  Input,
  Modal,
  Slider,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useEffect, useMemo, useState } from 'react';
import type {
  ConfigSnapshot,
  RatchetCompanionOptions,
} from '../models/appConfig';
import {
  getAppConfig,
  resetAppConfig,
  saveAppConfig,
} from '../services/appConfig';

type SettingsModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

type SaveState = 'idle' | 'saved' | 'reset';

const pollingBounds = {
  min: 1,
  max: 1000,
};

export function SettingsModal({ visible, onDismiss }: SettingsModalProps) {
  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [draft, setDraft] = useState<RatchetCompanionOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isCurrent = true;

    async function loadConfig() {
      try {
        setIsLoading(true);
        setError(null);
        setSaveState('idle');
        const nextSnapshot = await getAppConfig();

        if (!isCurrent) {
          return;
        }

        setSnapshot(nextSnapshot);
        setDraft(nextSnapshot.effective);
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Unable to load settings',
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      isCurrent = false;
    };
  }, [visible]);

  const validationError = useMemo(() => validateConfig(draft), [draft]);
  const canSubmit = !!draft && !validationError && !isLoading;

  const updateDraft = (nextDraft: RatchetCompanionOptions) => {
    setDraft(nextDraft);
    setSaveState('idle');
  };

  const handleSave = async () => {
    if (!draft || validationError) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const nextSnapshot = await saveAppConfig(draft);
      setSnapshot(nextSnapshot);
      setDraft(nextSnapshot.effective);
      setSaveState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);
      const nextSnapshot = await resetAppConfig();
      setSnapshot(nextSnapshot);
      setDraft(nextSnapshot.effective);
      setSaveState('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      size="large"
      position="top"
      header="Settings"
      closeAriaLabel="Close settings"
      onDismiss={onDismiss}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              iconName="refresh"
              loading={isResetting}
              disabled={isLoading || isSaving}
              onClick={handleReset}
            >
              Restore defaults
            </Button>
            <Button disabled={isSaving || isResetting} onClick={onDismiss}>
              Close
            </Button>
            <Button
              variant="primary"
              iconName="status-positive"
              loading={isSaving}
              disabled={!canSubmit || isResetting}
              onClick={handleSave}
            >
              Save
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error ? <Alert type="error">{error}</Alert> : null}
        {validationError ? (
          <Alert type="warning">{validationError}</Alert>
        ) : null}
        {saveState === 'saved' ? (
          <Alert type="success">
            Settings saved. Restart the app to apply changes.
          </Alert>
        ) : null}
        {saveState === 'reset' ? (
          <Alert type="success">
            Defaults restored. Restart the app to apply changes.
          </Alert>
        ) : null}
        {snapshot?.warnings.length ? (
          <Alert type="warning">{snapshot.warnings.join(' ')}</Alert>
        ) : null}
        <Alert type="info">
          Changes are saved immediately, but the app uses the new values after
          restart.
        </Alert>

        {draft ? (
          <SpaceBetween size="l">
            <SettingsSection title="Backend">
              <ColumnLayout columns={2}>
                <HostField
                  label="Host"
                  value={draft.backend.host}
                  onChange={(host) =>
                    updateDraft({
                      ...draft,
                      backend: { ...draft.backend, host },
                    })
                  }
                />
                <PortField
                  label="Port"
                  value={draft.backend.port}
                  onChange={(port) =>
                    updateDraft({
                      ...draft,
                      backend: { ...draft.backend, port },
                    })
                  }
                />
              </ColumnLayout>
            </SettingsSection>

            <SettingsSection title="PINE">
              <ColumnLayout columns={2}>
                <HostField
                  label="Host"
                  value={draft.pine.host}
                  onChange={(host) =>
                    updateDraft({
                      ...draft,
                      pine: { ...draft.pine, host },
                    })
                  }
                />
                <PortField
                  label="Port"
                  value={draft.pine.port}
                  onChange={(port) =>
                    updateDraft({
                      ...draft,
                      pine: { ...draft.pine, port },
                    })
                  }
                />
                <FormField label="Socket path">
                  <Input
                    value={draft.pine.socketPath ?? ''}
                    placeholder="Optional"
                    onChange={({ detail }) =>
                      updateDraft({
                        ...draft,
                        pine: {
                          ...draft.pine,
                          socketPath: detail.value.trim() || null,
                        },
                      })
                    }
                  />
                </FormField>
                <MillisecondInput
                  label="Timeout"
                  value={draft.pine.timeoutMilliseconds}
                  onChange={(timeoutMilliseconds) =>
                    updateDraft({
                      ...draft,
                      pine: { ...draft.pine, timeoutMilliseconds },
                    })
                  }
                />
              </ColumnLayout>
            </SettingsSection>

            <SettingsSection title="Polling">
              <SpaceBetween size="m">
                <PollingSlider
                  label="Memory polling"
                  value={draft.polling.memoryMilliseconds}
                  onChange={(memoryMilliseconds) =>
                    updateDraft({
                      ...draft,
                      polling: { ...draft.polling, memoryMilliseconds },
                    })
                  }
                />
                <PollingSlider
                  label="Status websocket"
                  value={draft.polling.websocketStatusMilliseconds}
                  onChange={(websocketStatusMilliseconds) =>
                    updateDraft({
                      ...draft,
                      polling: {
                        ...draft.polling,
                        websocketStatusMilliseconds,
                      },
                    })
                  }
                />
                <PollingSlider
                  label="Memory websocket"
                  value={draft.polling.websocketMemoryMilliseconds}
                  onChange={(websocketMemoryMilliseconds) =>
                    updateDraft({
                      ...draft,
                      polling: {
                        ...draft.polling,
                        websocketMemoryMilliseconds,
                      },
                    })
                  }
                />
              </SpaceBetween>
            </SettingsSection>

            <Box color="text-body-secondary">
              Config file: {snapshot?.configPath ?? 'Unknown'}
            </Box>
          </SpaceBetween>
        ) : (
          <Box color="text-body-secondary">
            {isLoading ? 'Loading settings' : 'Settings unavailable'}
          </Box>
        )}
      </SpaceBetween>
    </Modal>
  );
}

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <SpaceBetween size="s">
      <Header variant="h3">{title}</Header>
      {children}
    </SpaceBetween>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function HostField({ label, value, onChange }: TextFieldProps) {
  return (
    <FormField label={label}>
      <Input value={value} onChange={({ detail }) => onChange(detail.value)} />
    </FormField>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function PortField({ label, value, onChange }: NumberFieldProps) {
  return (
    <FormField label={label}>
      <Input
        type="number"
        inputMode="numeric"
        value={String(value)}
        onChange={({ detail }) => onChange(parseNumber(detail.value))}
      />
    </FormField>
  );
}

function MillisecondInput({ label, value, onChange }: NumberFieldProps) {
  return (
    <FormField label={label} description="Milliseconds">
      <Input
        type="number"
        inputMode="numeric"
        value={String(value)}
        onChange={({ detail }) => onChange(parseNumber(detail.value))}
      />
    </FormField>
  );
}

function PollingSlider({ label, value, onChange }: NumberFieldProps) {
  return (
    <FormField label={label} description={`${value} ms`}>
      <Slider
        min={pollingBounds.min}
        max={pollingBounds.max}
        step={1}
        value={value}
        referenceValues={[250, 500, 750]}
        valueFormatter={(nextValue) => `${nextValue} ms`}
        onChange={({ detail }) => onChange(detail.value)}
        i18nStrings={{
          valueTextRange: (previousValue, nextValue, followingValue) =>
            `${nextValue} ms between ${previousValue} and ${followingValue}`,
        }}
      />
    </FormField>
  );
}

function validateConfig(config: RatchetCompanionOptions | null) {
  if (!config) {
    return null;
  }

  if (!config.backend.host.trim()) {
    return 'Backend host is required.';
  }

  if (!isValidPort(config.backend.port)) {
    return 'Backend port must be between 1 and 65535.';
  }

  if (!config.pine.host.trim()) {
    return 'PINE host is required.';
  }

  if (!isValidPort(config.pine.port)) {
    return 'PINE port must be between 1 and 65535.';
  }

  if (config.pine.timeoutMilliseconds < 1) {
    return 'PINE timeout must be at least 1 ms.';
  }

  if (
    !isValidPolling(config.polling.memoryMilliseconds) ||
    !isValidPolling(config.polling.websocketStatusMilliseconds) ||
    !isValidPolling(config.polling.websocketMemoryMilliseconds)
  ) {
    return 'Polling values must be between 1 ms and 1000 ms.';
  }

  return null;
}

function parseNumber(value: string) {
  return Number.parseInt(value, 10) || 0;
}

function isValidPort(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function isValidPolling(value: number) {
  return (
    Number.isInteger(value) &&
    value >= pollingBounds.min &&
    value <= pollingBounds.max
  );
}
