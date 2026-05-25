import { Box, SpaceBetween } from '@cloudscape-design/components';
import { useEffect, useState } from 'react';
import { BackendStatusCard } from './components/BackendStatusCard';
import { SettingsModal } from './components/SettingsModal';
import { AppTopNavigation } from './components/TopNavigation';
import { useBackendStatus } from './hooks/useBackendStatus';
import { loadPvarOverlay } from './services/pvarOverlay';

function App() {
  const { status, error, isPending, toggleConnection } = useBackendStatus();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [pvarOverlayVersion, setPvarOverlayVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const refreshPvarOverlay = () => {
      void loadPvarOverlay()
        .then((didChange) => {
          if (isCurrent && didChange) {
            setPvarOverlayVersion((version) => version + 1);
          }
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    };

    refreshPvarOverlay();
    const intervalId = window.setInterval(refreshPvarOverlay, 2000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <AppTopNavigation
        status={status}
        error={error}
        isPending={isPending}
        onToggleConnection={toggleConnection}
        onOpenSettings={() => setIsSettingsVisible(true)}
      />
      <SettingsModal
        visible={isSettingsVisible}
        onDismiss={() => setIsSettingsVisible(false)}
      />
      <Box padding="l">
        <SpaceBetween size="l">
          <BackendStatusCard
            key={pvarOverlayVersion}
            status={status}
            error={error}
          />
        </SpaceBetween>
      </Box>
    </>
  );
}

export default App;
