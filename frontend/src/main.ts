/**
 * main.ts — Application entry point.
 *
 * Bootstraps the Angular application using the standalone API (Angular 17+).
 * The old NgModule-based bootstrap (platformBrowserDynamic().bootstrapModule())
 * is replaced by bootstrapApplication() which works directly with standalone
 * components and the appConfig providers.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(console.error);
