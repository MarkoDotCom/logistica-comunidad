import { Component, effect, ElementRef, model, viewChild } from '@angular/core';

// Modal sobre <dialog> nativo. El contenido aporta su propia superficie (normalmente un ui-card).
// Se cierra con Escape, clic en el fondo o el botón ×; el estado se sincroniza con [(open)].
@Component({
  selector: 'ui-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  readonly open = model(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }

  protected close(): void {
    this.open.set(false);
  }

  // Un clic en el fondo llega con el propio <dialog> como target; los del contenido no
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
