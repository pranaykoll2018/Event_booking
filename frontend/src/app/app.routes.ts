/**
 * app.routes.ts — Client-side route definitions.
 *
 * No route guards are needed here. If an unauthenticated user navigates
 * directly to /calendar or /admin, the first API call will return 401,
 * and the auth interceptor will automatically log them out and redirect
 * to /login. This keeps the routing layer simple.
 *
 * Route structure:
 *   /            → redirects to /login
 *   /login       → LoginComponent      (public)
 *   /calendar    → CalendarComponent   (redirected to /login if no token)
 *   /preferences → PreferencesComponent (redirected to /login if no token)
 *   /admin       → AdminComponent      (redirected to /login if no token)
 *   /**          → redirects to /login (catch-all for unknown paths)
 */

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { PreferencesComponent } from './components/preferences/preferences.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
  { path: '',           redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',      component: LoginComponent },
  { path: 'calendar',   component: CalendarComponent },
  { path: 'preferences',component: PreferencesComponent },
  { path: 'admin',      component: AdminComponent },
  { path: '**',         redirectTo: 'login' },  // catch-all unknown routes
];
