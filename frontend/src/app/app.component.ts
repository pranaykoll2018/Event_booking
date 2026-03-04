/**
 * app.component.ts — Root shell component.
 *
 * Renders the top toolbar and the <router-outlet> where all page components load.
 *
 * The toolbar is context-aware — it reads the currentUser signal from AuthService
 * and shows different nav links depending on the user's role:
 *   - Not logged in  → no nav links shown
 *   - Regular user   → Calendar, Preferences, Logout
 *   - Admin          → Calendar, Admin, Logout
 *
 * Using Angular's signal (currentUser) means the toolbar re-renders automatically
 * whenever the user logs in or out — no manual change detection needed.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span>Event Booking</span>
      <span class="spacer"></span>

      <!-- Only show navigation when a user is logged in -->
      <ng-container *ngIf="auth.currentUser() as user">
        <!-- All users see the calendar -->
        <button mat-button routerLink="/calendar">Calendar</button>

        <!-- Preferences only for regular users -->
        <button mat-button routerLink="/preferences" *ngIf="!user.is_admin">Preferences</button>

        <!-- Admin panel only for admins -->
        <button mat-button routerLink="/admin" *ngIf="user.is_admin">Admin</button>

        <!-- Logout clears localStorage and redirects to /login -->
        <button mat-button (click)="logout()">Logout ({{ user.username }})</button>
      </ng-container>
    </mat-toolbar>

    <!-- All routed components render here -->
    <router-outlet />
  `,
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();              // clears token + user from localStorage
    this.router.navigate(['/login']); // redirect to login page
  }
}
