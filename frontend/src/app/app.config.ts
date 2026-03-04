/**
 * app.config.ts — Global application providers.
 *
 * This replaces the old AppModule providers array. Everything that needs to be
 * available app-wide is registered here:
 *
 *   provideRouter          — sets up the client-side router with our route definitions
 *   provideHttpClient      — provides HttpClient for all services; withInterceptors()
 *                            registers the JWT interceptor so it runs on every request
 *   provideAnimations      — required by Angular Material components for transitions
 */

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // Register the auth interceptor globally — it will attach the JWT Bearer
    // token to every outgoing HTTP request automatically.
    provideHttpClient(withInterceptors([authInterceptor])),

    provideAnimations(),
  ],
};
