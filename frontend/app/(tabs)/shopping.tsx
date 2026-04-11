import React from 'react';

import { ShoppingSection } from '../../components/shopping/ShoppingSection';
import { useActivePlan } from '../../hooks/usePlan';

export default function ShoppingScreen() {
  const { data: activePlan } = useActivePlan();
  return <ShoppingSection planId={activePlan?.id} variant="screen" />;
}
