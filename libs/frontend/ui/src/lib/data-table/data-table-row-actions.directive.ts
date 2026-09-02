import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marks the `<ng-template>` that renders the trailing "actions" cell of a
 * {@link DataTable} row:
 *
 * ```html
 * <lib-data-table [columns]="cols" [dataSource]="load">
 *   <ng-template libDataTableRowActions let-row>
 *     <button mat-button (click)="edit(row)">Edit</button>
 *   </ng-template>
 * </lib-data-table>
 * ```
 */
@Directive({ selector: '[libDataTableRowActions]' })
export class DataTableRowActionsDirective<T = unknown> {
  readonly template = inject<TemplateRef<{ $implicit: T }>>(TemplateRef);
}
