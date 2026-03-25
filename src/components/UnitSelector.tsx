import React from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UnitSelector() {
  const { units, selectedUnit, selectUnit } = useUnit();

  if (units.length <= 1) {
    return selectedUnit ? (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{selectedUnit.name}</span>
      </div>
    ) : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="w-4 h-4" />
          <span>{selectedUnit?.name || 'Selecionar Unidade'}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {units.map((unit) => (
          <DropdownMenuItem
            key={unit.id}
            onClick={() => selectUnit(unit)}
            className={selectedUnit?.id === unit.id ? 'bg-primary/10' : ''}
          >
            <Building2 className="w-4 h-4 mr-2" />
            {unit.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
