import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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

  constructor(private fb: FormBuilder) {
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

    const { staffId, password } = this.loginForm.value;

    // Stub until API/AD/AppSec is wired
    const isValidUlUser = staffId === 'UL123' && password === 'Password!';

    setTimeout(() => {
      if (!isValidUlUser) {
        this.authError = 'Invalid Staff ID or Password. Please try again.';
        this.submitting = false;
        return;
      }

      this.submitting = false;
      alert('Login successful (stub). Replace with navigation to dashboard.');
    }, 600);
  }
}
