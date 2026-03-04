/**
 * auth.service.ts — Authentication state and API calls.
 *
 * This service is the single source of truth for auth state. It:
 *   - Calls the login/register API endpoints
 *   - Stores the JWT token and user object in localStorage (persists across refreshes)
 *   - Exposes currentUser as an Angular Signal so components react to auth changes
 *   - Exposes getToken() for the HTTP interceptor to read
 *
 * Using a Signal (rather than BehaviorSubject) means components read
 * auth.currentUser() directly in templates — Angular tracks the dependency
 * and re-renders automatically when the value changes.
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { User, AuthResponse } from '../models/models';

@Injectable({ providedIn: 'root' })  // singleton — one instance for the whole app
export class AuthService {
  private readonly API        = 'http://localhost:8000';
  private readonly TOKEN_KEY  = 'access_token';  // localStorage key for the JWT
  private readonly USER_KEY   = 'user';           // localStorage key for the user object

  /**
   * Reactive signal holding the currently logged-in user, or null if not logged in.
   * Initialised from localStorage so state survives page refreshes.
   * Read in templates as: auth.currentUser()
   */
  currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem(this.USER_KEY) ?? 'null')
  );

  constructor(private http: HttpClient) {}

  /**
   * Send login credentials to the API and store the returned JWT + user.
   * Uses tap() to handle the side effect (storing to localStorage) inside the
   * Observable stream — the component just subscribes and navigates.
   */
  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.API}/auth/login`, { username, password })
      .pipe(
        tap(({ access_token, user }) => {
          localStorage.setItem(this.TOKEN_KEY, access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);  // triggers re-render of toolbar
        })
      );
  }

  /**
   * Register a new account. Does not log the user in automatically —
   * the login component shows a success message and switches to login mode.
   */
  register(username: string, password: string, is_admin = false) {
    return this.http.post<User>(
      `${this.API}/auth/register`,
      { username, password, is_admin }
    );
  }

  /**
   * Log out the current user.
   * Clears localStorage and resets the signal — toolbar disappears immediately.
   * The interceptor handles the /login redirect on 401s; explicit logout just
   * clears state here (the router.navigate call is in AppComponent).
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  /**
   * Return the stored JWT token string, or null if not logged in.
   * Called by the HTTP interceptor on every outgoing request.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
