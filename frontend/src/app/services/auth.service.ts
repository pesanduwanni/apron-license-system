import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type UserRole =
  | 'applicant'
  | 'sectional_manager'
  | 'safety_manager'
  | 'trainer'
  | 'nurse'
  | 'doctor';

export interface User {
  username: string;
  password: string;
  role: UserRole;
  name: string;
  staffNumber: string;
  department: string;
  designation?: string;
  contactNumber?: string;
  nic?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'currentUser';

  private mockAccounts: User[] = [
    {
      username: 'olivia.isabella@ul.com',
      password: 'applicant123',
      role: 'applicant',
      name: 'Olivia Isabella',
      staffNumber: '423231',
      department: 'Information Technology',
      designation: 'Senior Software Engineer',
      contactNumber: '071 546 5645',
      nic: '923836657V'
    },
    {
      username: 'sectional@ul.com',
      password: 'sectional123',
      role: 'sectional_manager',
      name: 'Kamala Silva',
      staffNumber: 'STF002',
      department: 'Operations Management'
    },
    {
      username: 'safety@ul.com',
      password: 'safety123',
      role: 'safety_manager',
      name: 'Nimal Fernando',
      staffNumber: 'STF003',
      department: 'Safety Department'
    },
    {
      username: 'trainer@ul.com',
      password: 'trainer123',
      role: 'trainer',
      name: 'Sunil Jayawardena',
      staffNumber: 'STF004',
      department: 'Training Department'
    },
    {
      username: 'nurse@ul.com',
      password: 'nurse123',
      role: 'nurse',
      name: 'Malini Rathnayake',
      staffNumber: 'STF005',
      department: 'Medical Unit'
    },
    {
      username: 'doctor@ul.com',
      password: 'doctor123',
      role: 'doctor',
      name: 'Dr. Ranjan Wijesinghe',
      staffNumber: 'STF006',
      department: 'Medical Unit'
    }
  ];

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Login using username and password
  login(username: string, password: string): boolean {
    const normalizedUsername = username.trim().toLowerCase();

    const user = this.mockAccounts.find(
      (account) =>
        account.username.toLowerCase() === normalizedUsername &&
        account.password === password
    );

    if (user) {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
      this.currentUserSubject.next(user);
      return true;
    }

    return false;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }

  private getStoredUser(): User | null {
    const storedUser = localStorage.getItem(this.storageKey);
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  }
}
