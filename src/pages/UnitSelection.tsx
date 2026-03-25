import React from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import logoDark from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';
import { useTheme } from 'next-themes';

export default function UnitSelection() {
  const { units, selectUnit } = useUnit();
  const { resolvedTheme } = useTheme();
  const logoImg = resolvedTheme === 'dark' ? logoDark : logoLight;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 animate-slide-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <img src={logoImg} alt="VV Refeições" className="h-16 mx-auto w-auto" />
          <h1 className="text-2xl font-bold">Selecionar Unidade</h1>
          <p className="text-muted-foreground">Escolha a unidade para continuar</p>
        </div>

        <div className="grid gap-3">
          {units.map((unit) => (
            <Card
              key={unit.id}
              className="glass-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => selectUnit(unit)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{unit.name}</CardTitle>
                    <CardDescription>{unit.code}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
