import {
  Badge,
  Box,
  Header,
  Table,
  Tabs,
  type TableProps,
  type TabsProps,
} from '@cloudscape-design/components';
import { useMemo, useState } from 'react';
import { getMobyName } from '../data/pvarOverlayLookup';
import type { MobySummary } from '../models/gameData';

type MobyListCardProps = {
  title: string;
  mobys: MobySummary[];
  gameId: number;
};

function formatOClass(value: number) {
  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
}

function formatPointer(value: number) {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

export function MobyListCard({ title, mobys, gameId }: MobyListCardProps) {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'static'>('dynamic');

  const dynamicMobys = useMemo(
    () => mobys.filter((moby) => moby.isDynamic),
    [mobys],
  );
  const staticMobys = useMemo(
    () => mobys.filter((moby) => !moby.isDynamic),
    [mobys],
  );
  const visibleMobys = activeTab === 'dynamic' ? dynamicMobys : staticMobys;

  const columnDefinitions: TableProps.ColumnDefinition<MobySummary>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (moby) =>
        getMobyName(moby.oClass, gameId) ?? formatOClass(moby.oClass),
      sortingComparator: (a, b) =>
        (getMobyName(a.oClass, gameId) ?? formatOClass(a.oClass)).localeCompare(
          getMobyName(b.oClass, gameId) ?? formatOClass(b.oClass),
        ),
      isRowHeader: true,
    },
    {
      id: 'oclass',
      header: 'OClass',
      cell: (moby) => formatOClass(moby.oClass),
      sortingComparator: (a, b) => a.oClass - b.oClass,
    },
    {
      id: 'pointer',
      header: 'Pointer',
      cell: (moby) => formatPointer(moby.pointer),
      sortingComparator: (a, b) => a.pointer - b.pointer,
    },
  ];

  const tabs: TabsProps.Tab[] = [
    { id: 'dynamic', label: `Dynamic (${dynamicMobys.length})`, content: null },
    { id: 'static', label: `Static (${staticMobys.length})`, content: null },
  ];

  return (
    <Table
      variant="container"
      header={
        <Header
          variant="h2"
          headingTagOverride="h3"
          counter={
            <Badge color={visibleMobys.length > 0 ? 'green' : 'grey'}>
              {visibleMobys.length}
            </Badge>
          }
          description="Live Moby summaries grouped by allocation type."
        >
          {title}
        </Header>
      }
      filter={
        <Tabs
          ariaLabel={`${title} tabs`}
          tabs={tabs}
          activeTabId={activeTab}
          onChange={({ detail }) =>
            setActiveTab(detail.activeTabId as 'dynamic' | 'static')
          }
        />
      }
      items={visibleMobys}
      trackBy={(item) => `${item.pointer}-${item.oClass}`}
      columnDefinitions={columnDefinitions}
      wrapLines
      stripedRows
      contentDensity="compact"
      sortingColumn={columnDefinitions[0]}
      empty={
        <Box textAlign="center" color="inherit">
          No {activeTab} mobys available.
        </Box>
      }
      ariaLabels={{ tableLabel: title }}
    />
  );
}
