/**
 * admin.component.ts — Admin slot management view.
 *
 * Two sections:
 *   1. Add Slot form   — create a new time slot using a date picker + time selects
 *   2. All Slots table — view every slot with subscriber count and a delete button
 *
 * Form controls:
 *   - Title input        — free text
 *   - Category select    — one of Cat 1 / Cat 2 / Cat 3
 *   - MatDatepicker      — Material calendar popup for selecting the date
 *   - Start time         — two MatSelect dropdowns: hour (0–23) and minute (0/15/30/45)
 *   - End time           — same as start time
 *
 * Validation (client-side before API call):
 *   - Title, category, and date are required
 *   - End time must be strictly after start time
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SlotsService } from '../../services/slots.service';
import { TimeSlot } from '../../models/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTableModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="page-container">
      <h2>Admin — Manage Time Slots</h2>

      <!-- ── Add slot form ─────────────────────────────────────────── -->
      <mat-card class="form-card">
        <mat-card-title>Add New Slot</mat-card-title>
        <mat-card-content>

          <!-- Row 1: title and category -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="field-title">
              <mat-label>Title</mat-label>
              <input matInput [(ngModel)]="form.title" placeholder="e.g. Morning Yoga" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-cat">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="form.category">
                <mat-option *ngFor="let c of categories" [value]="c">{{ c }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Row 2: date picker — opens a Material calendar popup -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="field-date">
              <mat-label>Date</mat-label>
              <!-- readonly prevents manual text entry; the picker is the only input -->
              <input matInput [matDatepicker]="picker" [(ngModel)]="form.date" readonly />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Row 3: start and end time pickers (hour + minute selects) -->
          <div class="form-row">

            <!-- Start time -->
            <div class="time-group">
              <span class="time-label">Start time</span>
              <div class="time-selects">
                <mat-form-field appearance="outline" class="field-time">
                  <mat-label>Hour</mat-label>
                  <mat-select [(ngModel)]="form.startHour">
                    <!-- 0–23 formatted as two digits -->
                    <mat-option *ngFor="let h of hours" [value]="h">
                      {{ h | number:'2.0' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                <span class="colon">:</span>
                <mat-form-field appearance="outline" class="field-time">
                  <mat-label>Min</mat-label>
                  <mat-select [(ngModel)]="form.startMin">
                    <!-- 15-minute increments: 00, 15, 30, 45 -->
                    <mat-option *ngFor="let m of minutes" [value]="m">
                      {{ m | number:'2.0' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <!-- End time -->
            <div class="time-group">
              <span class="time-label">End time</span>
              <div class="time-selects">
                <mat-form-field appearance="outline" class="field-time">
                  <mat-label>Hour</mat-label>
                  <mat-select [(ngModel)]="form.endHour">
                    <mat-option *ngFor="let h of hours" [value]="h">
                      {{ h | number:'2.0' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                <span class="colon">:</span>
                <mat-form-field appearance="outline" class="field-time">
                  <mat-label>Min</mat-label>
                  <mat-select [(ngModel)]="form.endMin">
                    <mat-option *ngFor="let m of minutes" [value]="m">
                      {{ m | number:'2.0' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="resetForm()">Clear</button>
          <button mat-raised-button color="primary" (click)="addSlot()">Add Slot</button>
        </mat-card-actions>
      </mat-card>

      <!-- ── All slots table ───────────────────────────────────────── -->
      <mat-card class="table-card">
        <mat-card-title>All Slots</mat-card-title>
        <mat-card-content>
          <table mat-table [dataSource]="slots" class="full-width">

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let s">{{ s.title }}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let s">{{ s.category }}</td>
            </ng-container>

            <ng-container matColumnDef="start">
              <th mat-header-cell *matHeaderCellDef>Start</th>
              <td mat-cell *matCellDef="let s">{{ s.start_time | date:'dd/MM/yy HH:mm':'UTC' }}</td>
            </ng-container>

            <ng-container matColumnDef="end">
              <th mat-header-cell *matHeaderCellDef>End</th>
              <td mat-cell *matCellDef="let s">{{ s.end_time | date:'HH:mm':'UTC' }}</td>
            </ng-container>

            <!-- Subscriber count — blue if any, green if none -->
            <ng-container matColumnDef="subscribers">
              <th mat-header-cell *matHeaderCellDef>Subscribers</th>
              <td mat-cell *matCellDef="let s">
                <span [class]="s.booking_count > 0 ? 'booked-tag' : 'free-tag'">
                  {{ s.booking_count }} subscribed
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let s">
                <button mat-icon-button color="warn" (click)="deleteSlot(s.id)"
                        title="Delete slot and all its bookings">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
          <p *ngIf="slots.length === 0" class="empty-msg">No slots yet.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-card, .table-card { margin-bottom: 24px; }

    .form-row {
      display: flex; gap: 12px; flex-wrap: wrap;
      align-items: flex-start; margin-top: 12px;
    }
    .field-title { flex: 2 1 240px; }
    .field-cat   { flex: 1 1 140px; }
    .field-date  { flex: 1 1 200px; }

    .time-group { display: flex; flex-direction: column; gap: 4px; }
    .time-label { font-size: 12px; color: #666; padding-left: 2px; }
    .time-selects { display: flex; align-items: center; gap: 4px; }
    .field-time { width: 80px; }
    /* Colon separator between hour and minute — offset to align with input height */
    .colon { font-size: 20px; font-weight: bold; color: #555; padding-bottom: 18px; }

    .full-width { width: 100%; }
    .booked-tag { color: #3f51b5; font-weight: 500; font-size: 13px; }
    .free-tag   { color: #4caf50; font-size: 13px; }
    .empty-msg  { text-align: center; color: #999; padding: 16px 0; }
  `]
})
export class AdminComponent implements OnInit {
  categories = ['Cat 1', 'Cat 2', 'Cat 3'];
  columns    = ['title', 'category', 'start', 'end', 'subscribers', 'actions'];
  slots: TimeSlot[] = [];

  // Hour options 0–23 for the time picker dropdowns
  hours   = Array.from({ length: 24 }, (_, i) => i);
  // Minute options in 15-minute increments
  minutes = [0, 15, 30, 45];

  form = this.emptyForm();

  constructor(private slotsService: SlotsService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  /** Return a fresh empty form object. Used on init and after a successful submit. */
  private emptyForm() {
    return {
      title:     '',
      category:  '',
      date:      null as Date | null,
      startHour: 9,   // default to 09:00
      startMin:  0,
      endHour:   10,  // default to 10:00
      endMin:    0,
    };
  }

  resetForm() { this.form = this.emptyForm(); }

  /** Fetch all slots from the API and populate the table. */
  load() {
    this.slotsService.getAllSlots().subscribe(slots => (this.slots = slots));
  }

  /**
   * Combine the selected date with hour and minute values to produce an ISO string.
   * Sets seconds and milliseconds to zero for clean timestamps.
   */
  /**
   * Build a LOCAL ISO string (no timezone conversion).
   * Avoids .toISOString() which shifts to UTC — e.g. 09:00 IST becomes 03:30 UTC.
   * The backend stores exactly what the admin typed.
   */
  private buildDateTime(date: Date, hour: number, minute: number): string {
    const d    = new Date(date);
    const pad  = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}:00`;
  }

  /** Validate form inputs, build the payload, and call the create API. */
  addSlot() {
    const { title, category, date, startHour, startMin, endHour, endMin } = this.form;

    // Client-side required field validation
    if (!title || !category || !date) {
      this.snack.open('Title, category and date are required', 'OK', { duration: 2500 });
      return;
    }

    const start_time = this.buildDateTime(date, startHour, startMin);
    const end_time   = this.buildDateTime(date, endHour,   endMin);

    // Validate time ordering before sending to the server
    if (new Date(end_time) <= new Date(start_time)) {
      this.snack.open('End time must be after start time', 'OK', { duration: 2500 });
      return;
    }

    this.slotsService.createSlot({ title, category, start_time, end_time } as any).subscribe({
      next: () => {
        this.snack.open('Slot added', 'OK', { duration: 2000 });
        this.resetForm();  // clear the form ready for the next entry
        this.load();       // refresh the table
      },
      error: e => this.snack.open(e.error?.detail ?? 'Error', 'OK', { duration: 3000 })
    });
  }

  /** Delete a slot and all its bookings, then refresh the table. */
  deleteSlot(id: number) {
    this.slotsService.deleteSlot(id).subscribe({
      next: () => {
        this.snack.open('Deleted', 'OK', { duration: 2000 });
        this.load();
      },
      error: () => this.snack.open('Error', 'OK', { duration: 2000 })
    });
  }
}