import React from 'react';

export function Footer() {
  return (
    <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border/50">
      <p>
        @2026 - Desenvolvido por{' '}
        <a
          href="https://thwebdesigner.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          TH Developer
        </a>
        {' '}- Todos os Direitos reservados
      </p>
    </footer>
  );
}
