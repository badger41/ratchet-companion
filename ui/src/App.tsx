import { Box, SpaceBetween } from '@cloudscape-design/components';
import { useEffect, useState } from 'react';
import { BackendStatusCard } from './components/BackendStatusCard';
import { SettingsModal } from './components/SettingsModal';
import { AppTopNavigation } from './components/TopNavigation';
import { useBackendStatus } from './hooks/useBackendStatus';
import { getAppConfig } from './services/appConfig';
import { loadPvarOverlay } from './services/pvarOverlay';

const preserveHexViewColorsClassName = 'preserve-hex-view-colors';

function App() {
  const { status, error, isPending, toggleConnection } = useBackendStatus();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [, setPvarOverlayVersion] = useState(0);

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

  useEffect(() => {
    let isCurrent = true;

    getAppConfig()
      .then((snapshot) => {
        if (!isCurrent) {
          return;
        }

        document.documentElement.classList.toggle(
          preserveHexViewColorsClassName,
          snapshot.effective.appearance.preserveHexViewColors,
        );
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      isCurrent = false;
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
          <BackendStatusCard status={status} error={error} />
        </SpaceBetween>
      </Box>
    </>
  );
}

export default App;
