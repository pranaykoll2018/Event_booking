/**
 * login.component.ts — Login and registration view.
 *
 * A single card that toggles between Login and Register mode.
 * On successful login, navigates to /admin (admin users) or /calendar (regular users).
 * On successful registration, switches back to login mode with a confirmation message.
 *
 * The "Register as admin" checkbox is present for development convenience.
 * In a real application this would be removed — admin accounts would be
 * created through a separate secure process.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <div class="center-wrap">
      <mat-card class="login-card">
        <mat-card-title>{{ isRegister ? 'Register' : 'Login' }}</mat-card-title>
        <mat-card-content>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Username</mat-label>
            <input matInput [(ngModel)]="username" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput type="password" [(ngModel)]="password" />
          </mat-form-field>

          <!-- Only shown in register mode — dev convenience only -->
          <div *ngIf="isRegister" class="admin-toggle">
            <label>
              <input type="checkbox" [(ngModel)]="isAdmin" /> Register as admin
            </label>
          </div>

        </mat-card-content>

        <mat-card-actions align="end">
          <!-- Toggle between login and register modes -->
          <button mat-button (click)="isRegister = !isRegister">
            {{ isRegister ? 'Back to Login' : 'Register' }}
          </button>
          <button mat-raised-button color="primary" (click)="submit()">
            {{ isRegister ? 'Create Account' : 'Login' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .center-wrap {
      display: flex; justify-content: center; align-items: center;
      min-height: 80vh;
    }
    .login-card { width: 340px; padding: 16px; }
    .full-width { width: 100%; margin-top: 8px; }
    .admin-toggle { margin: 4px 0 8px; font-size: 14px; }
  `]
})
export class LoginComponent {
  username   = '';
  password   = '';
  isAdmin    = false;
  isRegister = false;  // toggles between login and register form

  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  submit() {
    if (!this.username || !this.password) return;

    if (this.isRegister) {
      // Register flow — on success, switch to login mode
      this.auth.register(this.username, this.password, this.isAdmin).subscribe({
        next: () => {
          this.snack.open('Account created — please log in', 'OK', { duration: 3000 });
          this.isRegister = false;
        },
        error: e => this.snack.open(e.error?.detail ?? 'Error', 'OK', { duration: 3000 })
      });
    } else {
      // Login flow — on success, navigate based on role
      this.auth.login(this.username, this.password).subscribe({
        next: auth => this.router.navigate([auth.user.is_admin ? '/admin' : '/calendar']),
        error: () => this.snack.open('Invalid credentials', 'OK', { duration: 3000 })
      });
    }
  }
}
