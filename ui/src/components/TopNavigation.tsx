import {
  TopNavigation,
  type TopNavigationProps,
} from '@cloudscape-design/components';
import type { StatusResponse } from '../models/backendStatus';

type AppTopNavigationProps = {
  status: StatusResponse | null;
  error: string | null;
  isPending: boolean;
  onToggleConnection: () => void;
  onOpenSettings: () => void;
};

export function AppTopNavigation({
  status,
  error,
  isPending,
  onToggleConnection,
  onOpenSettings,
}: AppTopNavigationProps) {
  const isSessionActive = status?.connection.isSessionActive ?? false;
  const isProcessRunning = status?.connection.isProcessRunning ?? false;
  const isConnectedToPine = status?.connection.isConnectedToPine ?? false;
  const gameName = status?.detection.displayName ?? 'No title detected';
  const gameId =
    status?.detection.version?.build ??
    String(status?.detection.gameId ?? 'Unknown ID');

  const utilities: TopNavigationProps.Utility[] = [
    statusUtility({
      text: 'PCSX2',
      active: isProcessRunning,
      activeLabel: 'Detected',
      inactiveLabel: 'Not detected',
      details: [
        {
          label: 'Process',
          value: status?.connection.processName ?? 'Unknown',
        },
        {
          label: 'PID',
          value: status?.connection.processId?.toString() ?? 'Unknown',
        },
        {
          label: 'Session',
          value: isSessionActive ? 'Active' : 'Disconnected',
        },
      ],
    }),
    statusUtility({
      text: 'PINE',
      active: isConnectedToPine,
      activeLabel: 'Connected',
      inactiveLabel: 'Not connected',
      details: [
        {
          label: 'Connection',
          value: isConnectedToPine ? 'Connected to PINE' : 'No PINE connection',
        },
        {
          label: 'Endpoint',
          value: status?.connection.pineEndpoint ?? 'Unknown',
        },
        {
          label: 'Failure',
          value: status?.connection.pineFailureReason ?? 'None',
        },
        { label: 'Backend', value: status?.backend ?? 'Unknown' },
        {
          label: 'Session',
          value: isSessionActive ? 'Active' : 'Disconnected',
        },
      ],
    }),
  ];

  if (error) {
    utilities.push({
      type: 'menu-dropdown',
      text: 'Backend',
      title: 'Backend',
      iconName: 'status-warning',
      ariaLabel: 'Backend status details',
      items: [
        { id: 'error', text: 'Error', secondaryText: error, disabled: true },
      ],
      disableTextCollapse: true,
    });
  }

  utilities.push({
    type: 'button',
    iconName: 'settings',
    text: 'Settings',
    ariaLabel: 'Open settings',
    disableTextCollapse: true,
    onClick: onOpenSettings,
  });

  utilities.push({
    type: 'button',
    text: isSessionActive ? 'Disconnect' : 'Connect',
    iconName: isPending ? 'refresh' : isSessionActive ? 'stop-circle' : 'play',
    variant: isSessionActive ? 'link' : 'primary-button',
    ariaLabel: isSessionActive
      ? 'Disconnect backend session'
      : 'Connect backend session',
    disableTextCollapse: true,
    disableUtilityCollapse: true,
    onClick: onToggleConnection,
    ...(isPending ? { text: 'Working' } : {}),
  });

  return (
    <TopNavigation
      identity={{
        href: '#',
        title: `${gameName} (${gameId})`,
        onFollow: (event) => event.preventDefault(),
      }}
      utilities={utilities}
      i18nStrings={{
        overflowMenuDismissIconAriaLabel: 'Close menu',
        overflowMenuBackIconAriaLabel: 'Back',
        overflowMenuTriggerText: 'More',
        overflowMenuTitleText: 'Status',
      }}
    />
  );
}

type StatusUtilityConfig = {
  text: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  details: Array<{ label: string; value: string }>;
};

function statusUtility({
  text,
  active,
  activeLabel,
  inactiveLabel,
  details,
}: StatusUtilityConfig): TopNavigationProps.Utility {
  const statusLabel = active ? activeLabel : inactiveLabel;

  return {
    type: 'menu-dropdown',
    text,
    title: text,
    description: statusLabel,
    iconName: active ? 'status-positive' : 'status-stopped',
    ariaLabel: `${text}: ${statusLabel}`,
    disableTextCollapse: true,
    items: details.map(({ label, value }) => ({
      id: `${text}-${label}`,
      text: label,
      secondaryText: value,
      labelTag: label === 'Session' ? statusLabel : undefined,
      disabled: true,
    })),
  };
}
