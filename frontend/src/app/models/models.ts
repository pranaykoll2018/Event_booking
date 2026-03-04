/**
 * models/models.ts — TypeScript interfaces for API data shapes.
 *
 * These interfaces are the single source of truth for what the backend returns.
 * Keeping them in one file means:
 *  - Changes to the API only require updating one place
 *  - All services and components reference the same types
 *  - TypeScript will flag mismatches at compile time
 */

/** A registered application user. */
export interface User {
  id: number;
  username: string;
  is_admin: boolean;
}

/** Response returned by POST /auth/login. */
export interface AuthResponse {
  access_token: string;  // JWT token — stored in localStorage and sent with every request
  user: User;            // User details — stored in localStorage for UI display
}

/** A bookable event time slot. */
export interface TimeSlot {
  id: number;
  title: string;
  category: string;       // one of: "Cat 1" | "Cat 2" | "Cat 3"
  start_time: string;     // ISO 8601 datetime string
  end_time: string;       // ISO 8601 datetime string — always after start_time
  booking_count: number;  // total number of users currently subscribed
  booked_by_me: boolean;  // true if the currently logged-in user has subscribed
}
