import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      staffId: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.authError = null;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const staffId = (this.loginForm.value.staffId ?? '').trim();
    const password = this.loginForm.value.password ?? '';

    const authenticated = this.authService.login(staffId, password);

    this.submitting = false;

    if (!authenticated) {
      this.authError = 'Invalid Staff ID or Password. Please try again.';
      return;
    }

    const user = this.authService.currentUser;

    if (user?.role !== 'applicant') {
      this.authService.logout();
      this.authError = 'Only applicant accounts are supported at the moment.';
      return;
    }

    this.router.navigate(['/applicant']);
  }
}
