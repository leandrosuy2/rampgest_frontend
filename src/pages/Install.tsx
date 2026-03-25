import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2, Share, MoreVertical, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao app
        </Link>

        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg shadow-primary/20 border-2 border-primary/30">
            <img src="/pwa-192x192.png" alt="VV Refeições" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VV Refeições</h1>
          <p className="text-muted-foreground">Instale o app no seu dispositivo</p>
        </div>

        {isInstalled ? (
          <Card className="border-primary/50 bg-primary/10">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">App instalado!</h3>
                  <p className="text-muted-foreground text-sm">
                    O VV Refeições está instalado no seu dispositivo.
                  </p>
                </div>
                <Link to="/">
                  <Button className="w-full">Abrir App</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Instalação Rápida
              </CardTitle>
              <CardDescription>
                Clique no botão abaixo para instalar o app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Instalar App
              </Button>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Instalar no iPhone/iPad
              </CardTitle>
              <CardDescription>
                Siga os passos abaixo para instalar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Toque no botão <Share className="w-4 h-4 inline text-primary" /> <strong>Compartilhar</strong> na barra do Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Toque em <strong>"Adicionar"</strong> para confirmar
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Instalar no Android
              </CardTitle>
              <CardDescription>
                Siga os passos abaixo para instalar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Toque no menu <MoreVertical className="w-4 h-4 inline text-primary" /> no canto superior direito do Chrome
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Confirme a instalação
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3">Vantagens do app instalado:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Acesso rápido pela tela inicial
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Funciona offline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Notificações em tempo real
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Carregamento mais rápido
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
