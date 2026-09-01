import {
  Directive,
  Injector,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { ConsentService } from './consent.service';

/**
 * Runs `fn` once the given category is consented (immediately if it already
 * is). The starter never loads a third-party tag itself — this is the hook
 * to do it from, e.g. `runWhenConsented('analytics', () => loadAnalytics())`.
 * Call it in an injection context, or pass an `Injector`.
 */
export function runWhenConsented(
  categoryId: string,
  fn: () => void,
  options?: { injector?: Injector },
): void {
  const consent = options?.injector
    ? options.injector.get(ConsentService)
    : inject(ConsentService);
  const granted = consent.isGranted(categoryId);

  if (granted()) {
    fn();
    return;
  }

  let done = false;
  effect(
    () => {
      if (!done && granted()) {
        done = true;
        fn();
      }
    },
    options?.injector ? { injector: options.injector } : undefined,
  );
}

/**
 * Structural directive: renders its content only while the given category
 * is consented (e.g. wrap a third-party `<iframe>`).
 *
 *   <div *consentIf="'marketing'">…</div>
 */
// Structural directives follow the Angular convention of no element prefix
// (like `*ngIf`), so the `lib`-prefix selector rule doesn't apply here.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[consentIf]' })
export class ConsentIf {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly consent = inject(ConsentService);

  readonly consentIf = input.required<string>();

  private rendered = false;

  constructor() {
    effect(() => {
      const category = this.consentIf();
      const granted = this.consent.isGranted(category)();
      if (granted && !this.rendered) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.rendered = true;
      } else if (!granted && this.rendered) {
        this.viewContainer.clear();
        this.rendered = false;
      }
    });
  }
}
