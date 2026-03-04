/**
 * preferences.component.ts — Category preference selection view.
 *
 * Allows a user to select which event categories they want to see in the calendar.
 * Preferences are loaded from the API on init and saved back on submit.
 *
 * How preferences affect the calendar:
 *   - On calendar load, the user's saved preferences become the default active filters.
 *   - If no preferences are saved, all categories are shown by default.
 *   - The user can still toggle filters per-session on the calendar page.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { SlotsService } from '../../services/slots.service';

/** All valid event categories — must match CATEGORIES in the backend utils.py */
const ALL_CATEGORIES = ['Cat 1', 'Cat 2', 'Cat 3'];

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatCheckboxModule, MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <h2>My Preferences</h2>
      <mat-card>
        <mat-card-content>
          <p>Select the event categories you are interested in:</p>
          <div class="cats">
            <mat-checkbox
              *ngFor="let cat of categories"
              [checked]="selected.includes(cat)"
              (change)="toggle(cat, $event.checked)">
              {{ cat }}
            </mat-checkbox>
          </div>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-button routerLink="/calendar">Cancel</button>
          <button mat-raised-button color="primary" (click)="save()">Save</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cats { display: flex; gap: 24px; margin: 8px 0 16px; }
  `]
})
export class PreferencesComponent implements OnInit {
  categories = ALL_CATEGORIES;
  selected: string[] = [];  // currently checked categories

  constructor(
    private auth: AuthService,
    private slotsService: SlotsService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    // Load the user's existing preferences from the API on component init
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.slotsService.getPreferences(userId).subscribe(cats => (this.selected = cats));
  }

  /** Add or remove a category from the selected list when a checkbox changes. */
  toggle(cat: string, checked: boolean) {
    this.selected = checked
      ? [...this.selected, cat]           // add
      : this.selected.filter(c => c !== cat);  // remove
  }

  /** Save the selected preferences to the API and navigate to the calendar. */
  save() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    this.slotsService.savePreferences(userId, this.selected).subscribe({
      next: () => {
        this.snack.open('Preferences saved', 'OK', { duration: 2000 });
        this.router.navigate(['/calendar']);
      },
      error: () => this.snack.open('Failed to save', 'OK', { duration: 2000 })
    });
  }
}
