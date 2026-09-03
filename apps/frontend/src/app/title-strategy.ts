import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Suffix appended to every page title — rename for this project. */
const APP_NAME = 'Starter';

/**
 * Sets `document.title` from each route's `title` (walked by
 * `buildTitle`), with the app name appended. A route with no `title` just
 * shows the app name — never a stale one from the previous page.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
  }
}
