// jsdom no implementa showModal()/close() de <dialog>; los specs que abren un ui-dialog llaman a esto.
export function polyfillDialog(): void {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
