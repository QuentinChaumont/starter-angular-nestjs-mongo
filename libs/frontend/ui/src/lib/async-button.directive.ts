import {
  Directive,
  ElementRef,
  Renderer2,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
import { MatButton } from '@angular/material/button';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Turns a Material button into an async-action button: bind
 * `[libAsyncButton]` to the in-flight signal and the button disables
 * itself and shows an inline spinner (its label dims, layout is kept).
 * `[busyDisabled]` folds in the usual "form invalid" condition, so the
 * whole `[disabled]="form.invalid || saving()"` + `<mat-progress-bar>`
 * pattern collapses to one binding.
 *
 * ```html
 * <button mat-flat-button [libAsyncButton]="saving()" [busyDisabled]="form.invalid">
 *   Save
 * </button>
 * ```
 */
@Directive({
  selector: 'button[libAsyncButton]',
  host: {
    class: 'lib-async-button',
    '[class.lib-async-button--loading]': 'libAsyncButton()',
    '[attr.aria-busy]': 'libAsyncButton() ? "true" : null',
  },
})
export class AsyncButtonDirective {
  readonly libAsyncButton = input(false, { transform: booleanAttribute });
  readonly busyDisabled = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly matButton = inject(MatButton, { optional: true, self: true });
  private spinner: SVGElement | null = null;

  constructor() {
    effect(() => {
      const loading = this.libAsyncButton();
      const disabled = loading || this.busyDisabled();

      if (this.matButton) {
        this.matButton.disabled = disabled;
      } else {
        this.host.nativeElement.disabled = disabled;
      }

      if (loading) {
        this.showSpinner();
      } else {
        this.hideSpinner();
      }
    });
  }

  private showSpinner(): void {
    if (this.spinner) {
      return;
    }
    const el = this.host.nativeElement;
    // Freeze the current text colour before we blank it, so the spinner
    // stroke stays visible.
    const strokeColor = getComputedStyle(el).color || 'currentColor';

    const svg = this.renderer.createElement('svg', SVG_NS);
    this.renderer.setAttribute(svg, 'viewBox', '0 0 24 24');
    this.renderer.setAttribute(svg, 'width', '16');
    this.renderer.setAttribute(svg, 'height', '16');
    this.renderer.setAttribute(svg, 'aria-hidden', 'true');
    this.renderer.setAttribute(svg, 'class', 'lib-async-button__spinner');
    this.renderer.setStyle(svg, 'position', 'absolute');
    this.renderer.setStyle(svg, 'inset', '0');
    this.renderer.setStyle(svg, 'margin', 'auto');

    const circle = this.renderer.createElement('circle', SVG_NS);
    this.renderer.setAttribute(circle, 'cx', '12');
    this.renderer.setAttribute(circle, 'cy', '12');
    this.renderer.setAttribute(circle, 'r', '9');
    this.renderer.setAttribute(circle, 'fill', 'none');
    this.renderer.setAttribute(circle, 'stroke', strokeColor);
    this.renderer.setAttribute(circle, 'stroke-width', '2.5');
    this.renderer.setAttribute(circle, 'stroke-linecap', 'round');
    this.renderer.setAttribute(circle, 'stroke-dasharray', '40 18');

    const animate = this.renderer.createElement('animateTransform', SVG_NS);
    this.renderer.setAttribute(animate, 'attributeName', 'transform');
    this.renderer.setAttribute(animate, 'type', 'rotate');
    this.renderer.setAttribute(animate, 'from', '0 12 12');
    this.renderer.setAttribute(animate, 'to', '360 12 12');
    this.renderer.setAttribute(animate, 'dur', '0.7s');
    this.renderer.setAttribute(animate, 'repeatCount', 'indefinite');

    this.renderer.appendChild(circle, animate);
    this.renderer.appendChild(svg, circle);

    this.renderer.setStyle(el, 'position', 'relative');
    this.renderer.setStyle(el, 'color', 'transparent');
    this.renderer.appendChild(el, svg);
    this.spinner = svg;
  }

  private hideSpinner(): void {
    if (!this.spinner) {
      return;
    }
    this.renderer.removeChild(this.host.nativeElement, this.spinner);
    this.renderer.removeStyle(this.host.nativeElement, 'color');
    this.spinner = null;
  }
}
