import { Routes } from '@angular/router';
import { ApplicantDashboardComponent } from './applicant/applicant-dashboard.component';
import { applicantGuard } from './guards/applicant.guard';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'applicant',
    component: ApplicantDashboardComponent,
    canActivate: [applicantGuard]
  },

  // Show login immediately when opening http://localhost:4200/
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
