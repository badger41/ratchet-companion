import {
  Alert,
  Badge,
  Container,
  FormField,
  Grid,
  Header,
  Input,
  KeyValuePairs,
  SegmentedControl,
  SpaceBetween,
  Table,
  Tabs,
  TextFilter,
  type TabsProps,
} from '@cloudscape-design/components';
import { useMemo, useState } from 'react';
import { getPvarOverlayFields } from '../data/pvarOverlayLookup';
import { useMemoryBlock } from '../hooks/useMemoryBlock';
import type { MobySummary } from '../models/gameData';
import {
  mobyMemoryByteCount,
  parseMobyMemoryForGame,
} from '../models/mobyMemory';
import { formatCoordinate, formatPointer } from '../utils/format';
import { HexByteView, type HexByteHighlightRange } from './hex-byte-view';

const UYA_PVAR_OVERLAY_VERSION = 3;
const DL_PVAR_OVERLAY_VERSION = 4;
type MobyTabId = 'summary' | 'pvar' | 'net-object';
type PvarViewMode = 'overlay' | 'raw';
type NetObjectViewMode = 'fields' | 'raw';

type MobyInfoCardProps = {
  moby: MobySummary | null;
  gameId: number;
  pvarOverlayDataVersion: number;
};

export function MobyInfoCard({ moby, gameId }: MobyInfoCardProps) {
  const [activeTabId, setActiveTabId] = useState<MobyTabId>('summary');
  const [pvarViewMode, setPvarViewMode] = useState<PvarViewMode>('overlay');
  const [netObjectViewMode, setNetObjectViewMode] =
    useState<NetObjectViewMode>('fields');
  const isSummaryTabActive = activeTabId === 'summary';
  const isPvarTabActive = activeTabId === 'pvar';
  const isNetObjectTabActive = activeTabId === 'net-object';
  const { bytes, error } = useMemoryBlock(
    isSummaryTabActive ? (moby?.pointer ?? null) : null,
    mobyMemoryByteCount,
  );
  const { bytes: pvarBytes, error: pvarError } = useMemoryBlock(
    isPvarTabActive ? (moby?.pvar?.pointer ?? null) : null,
    moby?.pvar?.byteCount ?? 0,
  );
  const { bytes: netObjectBytes, error: netObjectError } = useMemoryBlock(
    isNetObjectTabActive ? (moby?.netObject?.pointer ?? null) : null,
    moby?.netObject?.byteCount ?? 0,
  );
  const overlayVersion =
    gameId === 4 ? DL_PVAR_OVERLAY_VERSION : UYA_PVAR_OVERLAY_VERSION;
  const memory = useMemo(
    () => parseMobyMemoryForGame(bytes, gameId),
    [bytes, gameId],
  );
  const pvarFields = getPvarOverlayFields(moby?.oClass ?? 0, overlayVersion);
  const pvarHighlights = useMemo(
    () => createPvarHighlights(pvarFields),
    [pvarFields],
  );
  const netObjectHighlights = useMemo(
    () => createNetObjectHighlights(moby?.netObject?.fields ?? []),
    [moby?.netObject?.fields],
  );

  if (!moby) {
    return null;
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          headingTagOverride="h3"
          counter={<Badge color="green">{formatPointer(moby.pointer)}</Badge>}
          description="Live memory details for the selected Moby."
        >
          Moby Info
        </Header>
      }
    >
      <Tabs
        ariaLabel="Moby detail tabs"
        activeTabId={activeTabId}
        onChange={({ detail }) =>
          setActiveTabId(detail.activeTabId as MobyTabId)
        }
        tabs={[
          {
            id: 'summary',
            label: 'Summary',
            content: (
              <SpaceBetween size="m">
                {error ? <Alert type="error">{error}</Alert> : null}
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: 'Position X',
                      value: formatCoordinate(memory?.position.x),
                    },
                    {
                      label: 'Position Y',
                      value: formatCoordinate(memory?.position.y),
                    },
                    {
                      label: 'Position Z',
                      value: formatCoordinate(memory?.position.z),
                    },
                    {
                      label: 'pClass',
                      value: memory ? formatPointer(memory.pClass) : '—',
                    },
                    {
                      label: 'pUpdate',
                      value: memory ? formatPointer(memory.pUpdate) : '—',
                    },
                    {
                      label: 'pVar',
                      value: memory ? formatPointer(memory.pVar) : '—',
                    },
                    {
                      label: 'netObject',
                      value: memory?.netObject
                        ? formatPointer(memory.netObject)
                        : '—',
                    },
                  ]}
                />
              </SpaceBetween>
            ),
          },
          createPvarTab(
            moby,
            pvarFields,
            pvarHighlights,
            pvarBytes,
            pvarError,
            pvarViewMode,
            setPvarViewMode,
          ),
          createNetObjectTab(
            moby,
            netObjectHighlights,
            netObjectBytes,
            netObjectError,
            netObjectViewMode,
            setNetObjectViewMode,
          ),
        ]}
      />
    </Container>
  );
}

function createNetObjectTab(
  moby: MobySummary,
  highlights: HexByteHighlightRange[],
  bytes: Uint8Array | null,
  error: string | null,
  viewMode: NetObjectViewMode,
  onViewModeChange: (viewMode: NetObjectViewMode) => void,
): TabsProps.Tab {
  return {
    id: 'net-object',
    label: 'net object',
    content: (
      <SpaceBetween size="m">
        {moby.netObject ? (
          <KeyValuePairs
            columns={3}
            items={[
              { label: 'Type', value: moby.netObject.dataType },
              {
                label: 'Pointer',
                value: formatPointer(moby.netObject.pointer),
              },
              {
                label: 'Size',
                value: `${moby.netObject.byteCount} bytes`,
              },
            ]}
          />
        ) : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        {!moby.netObject ? (
          <Alert type="info">
            No net object data type is mapped for this Moby.
          </Alert>
        ) : (
          <SpaceBetween size="m">
            <SegmentedControl
              label="net object view mode"
              selectedId={viewMode}
              onChange={({ detail }) =>
                onViewModeChange(detail.selectedId as NetObjectViewMode)
              }
              options={[
                { id: 'fields', text: 'Fields' },
                { id: 'raw', text: 'Raw' },
              ]}
            />
            {viewMode === 'fields' ? (
              <NetObjectFields fields={moby.netObject.fields} bytes={bytes} />
            ) : (
              <HexByteView
                bytes={bytes}
                highlights={highlights}
                bytesPerRow={16}
              />
            )}
          </SpaceBetween>
        )}
      </SpaceBetween>
    ),
  };
}

function NetObjectFields({
  fields,
  bytes,
}: {
  fields: NonNullable<MobySummary['netObject']>['fields'];
  bytes: Uint8Array | null;
}) {
  const [filteringText, setFilteringText] = useState('');
  const visibleFields = useMemo(() => {
    const query = filteringText.trim().toLowerCase();

    if (!query) {
      return fields;
    }

    return fields.filter((field) =>
      [field.category, field.name, field.dataType]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [fields, filteringText]);

  return (
    <Table
      variant="embedded"
      stickyHeader
      contentDensity="compact"
      items={visibleFields}
      trackBy={(field) => `${field.offset}-${field.name}`}
      filter={
        <TextFilter
          filteringText={filteringText}
          filteringPlaceholder="Find fields"
          filteringAriaLabel="Find net object fields"
          onChange={({ detail }) => setFilteringText(detail.filteringText)}
        />
      }
      columnDefinitions={[
        {
          id: 'category',
          header: 'Category',
          cell: (field) => field.category,
          sortingField: 'category',
        },
        {
          id: 'name',
          header: 'Field',
          cell: (field) => field.name,
          sortingField: 'name',
          isRowHeader: true,
        },
        {
          id: 'offset',
          header: 'Offset',
          cell: (field) => formatOffset(field.offset),
          sortingComparator: (left, right) => left.offset - right.offset,
        },
        {
          id: 'type',
          header: 'Type',
          cell: (field) => field.dataType,
          sortingField: 'dataType',
        },
        {
          id: 'size',
          header: 'Size',
          cell: (field) => `${field.byteCount} bytes`,
          sortingComparator: (left, right) => left.byteCount - right.byteCount,
        },
        {
          id: 'value',
          header: 'Value',
          cell: (field) => formatNetObjectFieldValue(bytes, field),
        },
      ]}
      sortingColumn={{ sortingField: 'category' }}
      empty={<Alert type="info">No fields match the current filter.</Alert>}
    />
  );
}

function createPvarTab(
  moby: MobySummary,
  fields: ReturnType<typeof getPvarOverlayFields>,
  highlights: HexByteHighlightRange[],
  bytes: Uint8Array | null,
  error: string | null,
  viewMode: PvarViewMode,
  onViewModeChange: (viewMode: PvarViewMode) => void,
): TabsProps.Tab {
  return {
    id: 'pvar',
    label: 'pvar data',
    content: (
      <SpaceBetween size="m">
        {moby.pvar ? (
          <KeyValuePairs
            columns={2}
            items={[
              { label: 'Name', value: moby.pvar.name },
              { label: 'Pointer', value: formatPointer(moby.pvar.pointer) },
              { label: 'Size', value: `${moby.pvar.byteCount} bytes` },
            ]}
          />
        ) : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        {!moby.pvar ? (
          <Alert type="info">
            No pvar overlay entry is mapped for this Moby.
          </Alert>
        ) : (
          <SpaceBetween size="m">
            <SegmentedControl
              label="pvar view mode"
              selectedId={viewMode}
              onChange={({ detail }) =>
                onViewModeChange(detail.selectedId as PvarViewMode)
              }
              options={[
                { id: 'overlay', text: 'Overlay' },
                { id: 'raw', text: 'Raw' },
              ]}
            />
            {viewMode === 'overlay' ? (
              <PvarOverlayFields fields={fields} bytes={bytes} />
            ) : (
              <HexByteView bytes={bytes} highlights={highlights} />
            )}
          </SpaceBetween>
        )}
      </SpaceBetween>
    ),
  };
}

function PvarOverlayFields({
  fields,
  bytes,
}: {
  fields: ReturnType<typeof getPvarOverlayFields>;
  bytes: Uint8Array | null;
}) {
  if (fields.length === 0) {
    return (
      <Alert type="info">
        No pvar overlay fields are mapped for this Moby.
      </Alert>
    );
  }

  return (
    <Grid
      gridDefinition={fields.map(() => ({
        colspan: { default: 12, xs: 6, s: 4 },
      }))}
    >
      {fields.map((field) => (
        <FormField
          key={`${field.Name}-${field.Offset}-${field.DataType}`}
          label={field.Name}
          description={`${field.DataType} @ ${formatOffset(field.Offset)}`}
        >
          <Input
            value={formatPvarFieldValue(bytes, field)}
            readOnly
            ariaLabel={`${field.Name} pvar value`}
          />
        </FormField>
      ))}
    </Grid>
  );
}

function formatPvarFieldValue(
  bytes: Uint8Array | null,
  field: ReturnType<typeof getPvarOverlayFields>[number],
) {
  if (!bytes || typeof field.Offset !== 'number') {
    return '—';
  }

  const byteCount = getPvarFieldByteCount(field);
  if (field.Offset < 0 || field.Offset + byteCount > bytes.byteLength) {
    return '—';
  }

  const fieldBytes = bytes.slice(field.Offset, field.Offset + byteCount);

  if (byteCount <= 4) {
    let value = 0;
    for (let index = 0; index < fieldBytes.byteLength; index++) {
      value += fieldBytes[index] << (index * 8);
    }

    return `0x${value
      .toString(16)
      .toUpperCase()
      .padStart(byteCount * 2, '0')}`;
  }

  return `0x${Array.from(fieldBytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join('')}`;
}

function createPvarHighlights(
  fields: ReturnType<typeof getPvarOverlayFields>,
): HexByteHighlightRange[] {
  return fields
    .filter(
      (
        field,
      ): field is ReturnType<typeof getPvarOverlayFields>[number] &
        Required<
          Pick<
            ReturnType<typeof getPvarOverlayFields>[number],
            'Name' | 'Offset'
          >
        > => typeof field.Name === 'string' && typeof field.Offset === 'number',
    )
    .map((field) => ({
      offset: field.Offset,
      byteCount: getPvarFieldByteCount(field),
      label: field.Name,
    }));
}

function createNetObjectHighlights(
  fields: NonNullable<MobySummary['netObject']>['fields'],
): HexByteHighlightRange[] {
  return fields.map((field) => ({
    offset: field.offset,
    byteCount: field.byteCount,
    label: field.name,
  }));
}

function formatNetObjectFieldValue(
  bytes: Uint8Array | null,
  field: NonNullable<MobySummary['netObject']>['fields'][number],
) {
  if (
    !bytes ||
    field.offset < 0 ||
    field.offset + field.byteCount > bytes.byteLength
  ) {
    return '—';
  }

  if (!isScalarDataType(field.dataType) || field.byteCount > 4) {
    return formatHexBytes(
      bytes.slice(field.offset, field.offset + Math.min(field.byteCount, 16)),
    );
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + field.offset,
    field.byteCount,
  );

  switch (field.dataType) {
    case 'float':
      return view.getFloat32(0, true).toFixed(3);
    case 'bool':
      return bytes[field.offset] ? 'true' : 'false';
    case 'char':
    case 'signed char':
      return String(view.getInt8(0));
    case 'unsigned char':
      return String(view.getUint8(0));
    case 'short':
    case 'short int':
      return String(view.getInt16(0, true));
    case 'unsigned short':
    case 'short unsigned int':
      return String(view.getUint16(0, true));
    case 'int':
      return String(view.getInt32(0, true));
    case 'unsigned int':
    default:
      return `0x${view.getUint32(0, true).toString(16).toUpperCase().padStart(8, '0')}`;
  }
}

function isScalarDataType(dataType: string) {
  return [
    'float',
    'bool',
    'char',
    'signed char',
    'unsigned char',
    'short',
    'short int',
    'unsigned short',
    'short unsigned int',
    'int',
    'unsigned int',
  ].includes(dataType);
}

function formatHexBytes(bytes: Uint8Array) {
  const suffix = bytes.byteLength >= 16 ? '…' : '';
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join('')}${suffix}`;
}

function getPvarFieldByteCount(
  field: ReturnType<typeof getPvarOverlayFields>[number],
) {
  const dataSize =
    field.DataSize ?? getDefaultPvarFieldByteCount(field.DataType);
  return dataSize * (field.Count ?? 1);
}

function getDefaultPvarFieldByteCount(dataType: string | undefined) {
  switch (dataType) {
    case 'Bool':
    case 'Byte':
    case 'byte':
      return 1;
    case 'ColorRGB':
      return 3;
    case 'ColorRGBA':
    case 'CuboidRef':
    case 'Enum':
    case 'float':
    case 'Float':
    case 'Integer':
    case 'LevelFXTex':
    case 'Mask':
    case 'MobyGroupId':
    case 'MobyRef':
    case 'MobyRefPVar':
    case 'MobyRefPVarValue':
    case 'MobyRefState':
    case 'PathGraphRef':
    case 'Pointer':
    case 'SplineRef':
    case 'TieGroupId':
      return 4;
    case 'ScreenPosition':
    case 'Vector2':
      return 8;
    case 'Vector3':
      return 12;
    case 'Vector4':
      return 16;
    default:
      return 4;
  }
}

function formatOffset(offset: number | undefined) {
  return typeof offset === 'number'
    ? `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
    : '—';
}
