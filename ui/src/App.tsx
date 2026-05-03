import { Box, SpaceBetween } from '@cloudscape-design/components';
import { useState } from 'react';
import { BackendStatusCard } from './components/BackendStatusCard';
import { SettingsModal } from './components/SettingsModal';
import { AppTopNavigation } from './components/TopNavigation';
import { useBackendStatus } from './hooks/useBackendStatus';

function App() {
  const { status, error, isPending, toggleConnection } = useBackendStatus();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

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
