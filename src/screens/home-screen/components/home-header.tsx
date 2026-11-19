import React from 'react';
import { Button } from '../../../components/button';
import { TabHeader } from '../../../components/tab-header';
import { StatsIcon } from './stats-icon';

interface HomeHeaderProps {
  showXp: boolean;
  onToggleXp: () => void;
}

export function HomeHeader({ showXp, onToggleXp }: HomeHeaderProps) {
  return (
    <TabHeader
      title="Routines"
      actions={
        <Button
          variant="icon"
          onPress={onToggleXp}
          accessibilityLabel={showXp ? 'Hide XP' : 'Show XP'}
        >
          <StatsIcon
            size={22}
            active={showXp}
          />
        </Button>
      }
    />
  );
}
