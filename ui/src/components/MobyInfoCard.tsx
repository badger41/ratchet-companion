import {
  Alert,
  Badge,
  Container,
  Header,
  KeyValuePairs,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useMemo } from 'react';
import { useMemoryBlock } from '../hooks/useMemoryBlock';
import type { MobySummary } from '../models/gameData';
import { mobyMemoryByteCount, parseMobyMemory } from '../models/mobyMemory';
import { formatCoordinate, formatPointer } from '../utils/format';

type MobyInfoCardProps = {
  moby: MobySummary | null;
};

export function MobyInfoCard({ moby }: MobyInfoCardProps) {
  const { bytes, error } = useMemoryBlock(
    moby?.pointer ?? null,
    mobyMemoryByteCount,
  );
  const memory = useMemo(() => parseMobyMemory(bytes), [bytes]);

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
            { label: 'pVar', value: memory ? formatPointer(memory.pVar) : '—' },
          ]}
        />
      </SpaceBetween>
    </Container>
  );
}
