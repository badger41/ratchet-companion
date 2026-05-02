import {
  Badge,
  Container,
  Header,
  KeyValuePairs,
} from '@cloudscape-design/components';
import type { PlayerPosition } from '../models/gameData';
import { formatCoordinate } from '../utils/format';

type PlayerCardProps = {
  title: string;
  position: PlayerPosition | null;
};

export function PlayerCard({ title, position }: PlayerCardProps) {
  return (
    <Container
      header={
        <Header
          variant="h2"
          headingTagOverride="h3"
          actions={
            <Badge color={position ? 'green' : 'grey'}>
              {position ? 'Live' : 'Unavailable'}
            </Badge>
          }
        >
          {title}
        </Header>
      }
    >
      <KeyValuePairs
        columns={3}
        items={[
          { label: 'X', value: formatCoordinate(position?.x) },
          { label: 'Y', value: formatCoordinate(position?.y) },
          { label: 'Z', value: formatCoordinate(position?.z) },
        ]}
      />
    </Container>
  );
}
