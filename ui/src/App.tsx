import { Box, SpaceBetween } from '@cloudscape-design/components';
import { BackendStatusCard } from './components/BackendStatusCard';
import { AppTopNavigation } from './components/TopNavigation';
import { useBackendStatus } from './hooks/useBackendStatus';

function App() {
  const { status, error, isPending, toggleConnection } = useBackendStatus();

  return (
    <>
      <AppTopNavigation
        status={status}
        error={error}
        isPending={isPending}
        onToggleConnection={toggleConnection}
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
