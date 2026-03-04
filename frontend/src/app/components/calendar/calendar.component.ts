/**
 * calendar.component.ts — Weekly calendar view.
 *
 * The main user-facing view. Displays time slots in a 7-column weekly grid.
 *
 * Key behaviours:
 *   - On init, loads the user's saved category preferences as default filters
 *   - Shows slots for the current week (Mon–Sun)
 *   - Week navigation: ◀ ▶ buttons shift by 7 days and reload slots
 *   - Category chips toggle which categories are visible
 *   - Each slot shows: title, time range, category, subscriber count
 *   - Slots the user has booked show green with an Unsubscribe button
 *   - Slots the user has not booked show a Subscribe button
 *   - Any number of users can subscribe to the same slot
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { SlotsService } from '../../services/slots.service';
import { TimeSlot } from '../../models/models';

const ALL_CATEGORIES = ['Cat 1', 'Cat 2', 'Cat 3'];
const DAY_LABELS     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">

      <!-- Week navigation — shifts the displayed week by 7 days -->
      <div class="week-nav">
        <button mat-icon-button (click)="changeWeek(-1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="week-label">{{ weekLabel }}</span>
        <button mat-icon-button (click)="changeWeek(1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <!-- Category filter chips — active filters are highlighted in indigo -->
      <div class="filters">
        <span class="filter-label">Filter:</span>
        <mat-chip-set>
          <mat-chip
            *ngFor="let cat of allCategories"
            [class.active-chip]="activeFilters.includes(cat)"
            (click)="toggleFilter(cat)">
            {{ cat }}
          </mat-chip>
        </mat-chip-set>
      </div>

      <!-- 7-column weekly grid — one column per day -->
      <div class="calendar-grid">
        <div class="day-col" *ngFor="let day of weekDays">

          <!-- Day header: abbreviated name + date -->
          <div class="day-header">
            <span class="day-name">{{ dayName(day) }}</span>
            <span class="day-num">{{ day | date:'d MMM' }}</span>
          </div>

          <!-- Placeholder when no slots exist for this day -->
          <div *ngIf="slotsForDay(day).length === 0" class="no-slots">—</div>

          <!-- Slot card — green border when the current user has subscribed -->
          <div
            *ngFor="let slot of slotsForDay(day)"
            class="slot-card"
            [class.booked-by-me]="slot.booked_by_me">

            <div class="slot-title">{{ slot.title }}</div>
            <div class="slot-meta">
              {{ slot.start_time | date:'HH:mm':'UTC' }} – {{ slot.end_time | date:'HH:mm':'UTC' }}
            </div>
            <div class="slot-cat">{{ slot.category }}</div>

            <!-- Subscriber count — shown for all slots -->
            <div class="slot-count">{{ slot.booking_count }} subscribed</div>

            <!-- Subscribe button — shown when current user has NOT booked -->
            <button
              *ngIf="!slot.booked_by_me"
              mat-stroked-button color="primary"
              class="slot-btn"
              (click)="book(slot)">
              Subscribe
            </button>

            <!-- Unsubscribe button — shown when current user HAS booked -->
            <button
              *ngIf="slot.booked_by_me"
              mat-stroked-button color="warn"
              class="slot-btn"
              (click)="cancel(slot)">
              Unsubscribe
            </button>

          </div>
        </div>
      </div>

      <p *ngIf="filteredSlots.length === 0" class="empty-msg">
        No slots this week for the selected categories.
      </p>
    </div>
  `,
  styles: [`
    .week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .week-label { font-size: 16px; font-weight: 500; }

    .filters { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .filter-label { font-size: 13px; color: #666; }
    mat-chip { cursor: pointer; font-size: 12px; }
    .active-chip { background: #3f51b5 !important; color: #fff !important; }

    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .day-col { display: flex; flex-direction: column; gap: 6px; }

    .day-header {
      text-align: center; padding: 4px 0;
      border-bottom: 1px solid #e0e0e0; margin-bottom: 4px;
    }
    .day-name { display: block; font-size: 11px; color: #888; text-transform: uppercase; }
    .day-num  { display: block; font-size: 13px; font-weight: 500; }

    .no-slots { text-align: center; color: #ccc; font-size: 13px; padding: 8px 0; }

    .slot-card {
      border: 1px solid #e0e0e0; border-radius: 4px;
      padding: 8px; background: #fff; font-size: 12px;
    }
    /* Green highlight when the current user has subscribed */
    .booked-by-me { border-color: #4caf50; background: #f1f8f1; }

    .slot-title { font-weight: 600; margin-bottom: 2px; }
    .slot-meta  { color: #666; }
    .slot-cat   { color: #999; font-size: 11px; }
    .slot-count { color: #3f51b5; font-size: 11px; margin-bottom: 4px; }
    .slot-btn   { width: 100%; margin-top: 4px; font-size: 11px; }

    .empty-msg { text-align: center; color: #999; margin-top: 32px; }
  `]
})
export class CalendarComponent implements OnInit {
  allCategories  = ALL_CATEGORIES;
  activeFilters: string[] = [];   // categories currently visible in the grid
  weekStart!: Date;               // Monday of the currently displayed week
  weekDays: Date[]  = [];         // array of 7 Date objects (Mon–Sun)
  filteredSlots: TimeSlot[] = []; // all slots returned by the current API query

  constructor(
    private auth: AuthService,
    private slotsService: SlotsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    // Start on the current week's Monday
    this.setWeek(this.getMonday(new Date()));
    // Load preferences first — they become the default category filters
    this.loadUserPreferences();
  }

  /** Load saved preferences and use them as the initial category filter. */
  private loadUserPreferences() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.loadSlots(); return; }

    this.slotsService.getPreferences(userId).subscribe(cats => {
      // If no preferences saved, show all categories by default
      this.activeFilters = cats.length ? cats : [...ALL_CATEGORIES];
      this.loadSlots();
    });
  }

  /**
   * Calculate the Monday of the week containing the given date.
   * Handles Sunday (getDay() === 0) by going back 6 days.
   */
  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day  = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /** Set the week start and generate the 7-day array. */
  private setWeek(monday: Date) {
    this.weekStart = monday;
    this.weekDays  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  /** Human-readable week range label shown in the navigation header. */
  get weekLabel(): string {
    const end = this.weekDays[6];
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(this.weekStart)} – ${fmt(end)} ${end.getFullYear()}`;
  }

  /** Navigate to the previous or next week (dir: -1 or +1). */
  changeWeek(dir: number) {
    const next = new Date(this.weekStart);
    next.setDate(next.getDate() + dir * 7);
    this.setWeek(next);
    this.loadSlots();
  }

  /** Toggle a category chip on/off and reload slots. */
  toggleFilter(cat: string) {
    this.activeFilters = this.activeFilters.includes(cat)
      ? this.activeFilters.filter(c => c !== cat)
      : [...this.activeFilters, cat];
    this.loadSlots();
  }

  /** Fetch slots from the API for the current week and active category filters. */
  private loadSlots() {
    const weekEnd = new Date(this.weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);  // exclusive upper bound

    const cats = this.activeFilters.length ? this.activeFilters : ALL_CATEGORIES;
    this.slotsService.getSlots(this.weekStart, weekEnd, cats).subscribe(slots => {
      this.filteredSlots = slots;
    });
  }

  /** Return only the slots whose start_time falls on the given day. */
  slotsForDay(day: Date): TimeSlot[] {
    // Compare using UTC date parts — the backend stores times without timezone,
    // so we must not let the browser shift them into local time for comparison.
    return this.filteredSlots.filter(s => {
      const slotDate = new Date(s.start_time);  // already has Z suffix from backend
      return (
        slotDate.getUTCFullYear() === day.getFullYear() &&
        slotDate.getUTCMonth()    === day.getMonth()    &&
        slotDate.getUTCDate()     === day.getDate()
      );
    });
  }

  /** Abbreviated day name for the column header (Mon, Tue, etc.) */
  dayName(d: Date): string { return DAY_LABELS[d.getDay()]; }

  /** Subscribe the current user to a slot and refresh the grid. */
  book(slot: TimeSlot) {
    this.slotsService.book(slot.id).subscribe({
      next: () => {
        this.snack.open('Subscribed!', 'OK', { duration: 2000 });
        this.loadSlots();  // refresh to update booked_by_me and booking_count
      },
      error: e => this.snack.open(e.error?.detail ?? 'Error', 'OK', { duration: 3000 })
    });
  }

  /** Unsubscribe the current user from a slot and refresh the grid. */
  cancel(slot: TimeSlot) {
    this.slotsService.cancel(slot.id).subscribe({
      next: () => {
        this.snack.open('Unsubscribed', 'OK', { duration: 2000 });
        this.loadSlots();  // refresh to update booked_by_me and booking_count
      },
      error: () => this.snack.open('Error', 'OK', { duration: 2000 })
    });
  }
}