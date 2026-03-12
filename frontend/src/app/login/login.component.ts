import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  submitting = false;
  authError: string | null = null;
  dataMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private applicationsService: ApplicationsService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  resetDemoData(): void {
    this.applicationsService.resetToMockData();
    this.dataMessage = 'Demo data reset.';
  }

  clearAllData(): void {
    this.applicationsService.clearAllApplications();
    this.dataMessage = 'All application data cleared.';
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.authError = null;
    this.dataMessage = null;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const username = (this.loginForm.value.username ?? '').trim();
    const password = this.loginForm.value.password ?? '';

    const authenticated = this.authService.login(username, password);

    this.submitting = false;

    if (!authenticated) {
      this.authError = 'Invalid Username or Password. Please try again.';
      return;
    }

    const user = this.authService.currentUser;

    // Route based on user role
    switch (user?.role) {
      case 'applicant':
        this.router.navigate(['/applicant']);
        break;
      case 'sectional_manager':
        this.router.navigate(['/sectional-manager']);
        break;
      case 'safety_manager':
        this.router.navigate(['/safety-manager']);
        break;
      case 'trainer':
        this.router.navigate(['/trainer']);
        break;
      case 'nurse':
        this.router.navigate(['/nurse']);
        break;
      case 'doctor':
        this.router.navigate(['/doctor']);
        break;
      case 'safety_officer':
        this.router.navigate(['/safety-officer']);
        break;
      default:
        this.authService.logout();
        this.authError = 'Your role is not supported yet. Please contact the administrator.';
        return;
    }
  }
}
