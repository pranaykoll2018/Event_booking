/**
 * slots.service.ts — Facade over all slot, booking, and preference API calls.
 *
 * This service is the only place in the frontend that knows about API endpoints.
 * Components call descriptive methods (book, cancel, getSlots) without knowing
 * anything about HTTP mechanics, URLs, or query parameter formats.
 *
 * Note on user identity:
 *   book() and cancel() do NOT send a user_id parameter. The backend derives
 *   the user's identity from the JWT token (which the interceptor attaches
 *   automatically). This prevents a user from booking/cancelling as someone else.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TimeSlot } from '../models/models';

@Injectable({ providedIn: 'root' })  // singleton — shared across all components
export class SlotsService {
  private readonly API = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * Fetch time slots for a given week, optionally filtered by category.
   * Used by the calendar view to populate the weekly grid.
   *
   * @param weekStart  Monday of the week (00:00:00)
   * @param weekEnd    Following Monday (exclusive upper bound)
   * @param categories Optional list of categories to include
   */
  getSlots(weekStart: Date, weekEnd: Date, categories?: string[]) {
    // Use local ISO strings — toISOString() converts to UTC which shifts
    // the week boundaries for users outside UTC (e.g. IST = UTC+5:30).
    const localISO = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00:00`;
    };
    let params = new HttpParams()
      .set('week_start', localISO(weekStart))
      .set('week_end',   localISO(weekEnd));

    if (categories?.length) {
      params = params.set('categories', categories.join(','));
    }
    return this.http.get<TimeSlot[]>(`${this.API}/slots`, { params });
  }

  /**
   * Fetch ALL slots with no date or category filter.
   * Used by the admin view to show the full slot list.
   */
  getAllSlots() {
    return this.http.get<TimeSlot[]>(`${this.API}/slots`);
  }

  /**
   * Create a new time slot (admin only).
   * The backend will reject this with 403 if the JWT is not an admin token.
   */
  createSlot(slot: Omit<TimeSlot, 'id' | 'booked_by_me' | 'booking_count'>) {
    return this.http.post<TimeSlot>(`${this.API}/slots`, slot);
  }

  /** Delete a slot and all its bookings (admin only). */
  deleteSlot(slotId: number) {
    return this.http.delete(`${this.API}/slots/${slotId}`);
  }

  /**
   * Subscribe the current user to a slot.
   * No user_id needed — the server reads identity from the JWT.
   */
  book(slotId: number) {
    return this.http.post(`${this.API}/slots/${slotId}/book`, null);
  }

  /**
   * Unsubscribe the current user from a slot.
   * No user_id needed — the server reads identity from the JWT.
   */
  cancel(slotId: number) {
    return this.http.delete(`${this.API}/slots/${slotId}/book`);
  }

  /** Get the saved category preferences for a user. */
  getPreferences(userId: number) {
    return this.http.get<string[]>(`${this.API}/users/${userId}/preferences`);
  }

  /** Replace a user's saved category preferences. */
  savePreferences(userId: number, categories: string[]) {
    return this.http.put(`${this.API}/users/${userId}/preferences`, { categories });
  }
}