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
import { formatOClass, formatPointer } from '../utils/format';

type MobyListCardProps = {
  title: string;
  mobys: MobySummary[];
  gameId: number;
  showAllocationTabs?: boolean;
  selectedMoby: MobySummary | null;
  onSelectedMobyChange: (moby: MobySummary | null) => void;
};

export function MobyListCard({
  title,
  mobys,
  gameId,
  showAllocationTabs = true,
  selectedMoby,
  onSelectedMobyChange,
}: MobyListCardProps) {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'static'>('dynamic');

  const dynamicMobys = useMemo(
    () => mobys.filter((moby) => moby.isDynamic),
    [mobys],
  );
  const staticMobys = useMemo(
    () => mobys.filter((moby) => !moby.isDynamic),
    [mobys],
  );
  const visibleMobys = showAllocationTabs
    ? activeTab === 'dynamic'
      ? dynamicMobys
      : staticMobys
    : mobys;

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
    <div
      id="temp-wrapper"
      style={{
        maxHeight: '75vh',
        overflow: 'auto',
      }}
    >
      <Table
        variant="container"
        stickyHeader
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
          showAllocationTabs ? (
            <Tabs
              ariaLabel={`${title} tabs`}
              tabs={tabs}
              activeTabId={activeTab}
              onChange={({ detail }) =>
                setActiveTab(detail.activeTabId as 'dynamic' | 'static')
              }
            />
          ) : null
        }
        items={visibleMobys}
        selectedItems={selectedMoby ? [selectedMoby] : []}
        selectionType="single"
        onSelectionChange={({ detail }) =>
          onSelectedMobyChange(detail.selectedItems[0] ?? null)
        }
        trackBy={(item) => `${item.pointer}-${item.oClass}`}
        columnDefinitions={columnDefinitions}
        wrapLines
        stripedRows
        contentDensity="compact"
        sortingColumn={columnDefinitions[0]}
        empty={
          <Box textAlign="center" color="inherit">
            No {showAllocationTabs ? `${activeTab} ` : ''}mobys available.
          </Box>
        }
        ariaLabels={{
          tableLabel: title,
          selectionGroupLabel: 'Moby selection',
          itemSelectionLabel: ({ selectedItems }, item) =>
            `${selectedItems.includes(item) ? 'Deselect' : 'Select'} ${formatPointer(item.pointer)}`,
        }}
      />
    </div>
  );
}
