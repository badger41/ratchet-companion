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
  Tabs,
  type TabsProps,
} from '@cloudscape-design/components';
import { useMemo, useState } from 'react';
import { getPvarOverlayFields } from '../data/pvarOverlayLookup';
import { useMemoryBlock } from '../hooks/useMemoryBlock';
import type { MobySummary } from '../models/gameData';
import { mobyMemoryByteCount, parseMobyMemory } from '../models/mobyMemory';
import { formatCoordinate, formatPointer } from '../utils/format';
import { HexByteView, type HexByteHighlightRange } from './HexByteView';

const UYA_PVAR_OVERLAY_VERSION = 3;
type PvarViewMode = 'overlay' | 'raw';

type MobyInfoCardProps = {
  moby: MobySummary | null;
};

export function MobyInfoCard({ moby }: MobyInfoCardProps) {
  const [pvarViewMode, setPvarViewMode] = useState<PvarViewMode>('overlay');
  const { bytes, error } = useMemoryBlock(
    moby?.pointer ?? null,
    mobyMemoryByteCount,
  );
  const { bytes: pvarBytes, error: pvarError } = useMemoryBlock(
    moby?.pvar?.pointer ?? null,
    moby?.pvar?.byteCount ?? 0,
  );
  const memory = useMemo(() => parseMobyMemory(bytes), [bytes]);
  const pvarFields = useMemo(
    () => getPvarOverlayFields(moby?.oClass ?? 0, UYA_PVAR_OVERLAY_VERSION),
    [moby?.oClass],
  );
  const pvarHighlights = useMemo(
    () => createPvarHighlights(pvarFields),
    [pvarFields],
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
          counter={
            <Badge color={memory ? 'green' : 'grey'}>
              {formatPointer(moby.pointer)}
            </Badge>
          }
          description="Live memory details for the selected Moby."
        >
          Moby Info
        </Header>
      }
    >
      <Tabs
        ariaLabel="Moby detail tabs"
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
        ]}
      />
    </Container>
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
    case 'SplineRef':
    case 'TieGroupId':
      return 4;
    case 'ScreenPosition':
    case 'Vector2':
      return 8;
    case 'Vector3':
      return 12;
    default:
      return 4;
  }
}

function formatOffset(offset: number | undefined) {
  return typeof offset === 'number'
    ? `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`
    : '—';
}
