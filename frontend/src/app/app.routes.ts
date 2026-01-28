import { Routes } from '@angular/router';
import { ApplicantDashboardComponent } from './applicant/applicant-dashboard.component';
import { applicantGuard } from './guards/applicant.guard';
import { sectionalManagerGuard } from './guards/sectional-manager.guard';
import { LoginComponent } from './login/login.component';
import { SectionalLayoutComponent } from './sectional-manager/sectional-layout.component';
import { SectionalDashboardComponent } from './sectional-manager/sectional-dashboard.component';
import { SectionalRequestsComponent } from './sectional-manager/sectional-requests.component';
import { ApplicationDetailComponent } from './sectional-manager/application-detail.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Applicant routes
  {
    path: 'applicant',
    component: ApplicantDashboardComponent,
    canActivate: [applicantGuard]
  },

  // Sectional Manager routes
  {
    path: 'sectional-manager',
    canActivate: [sectionalManagerGuard],
    component: SectionalLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SectionalDashboardComponent },
      { path: 'requests', component: SectionalRequestsComponent, data: { mode: 'requests' } },
      { path: 'rejected', component: SectionalRequestsComponent, data: { mode: 'rejected' } },
      { path: 'application/:id', component: ApplicationDetailComponent }
    ]
  },

  // Show login immediately when opening http://localhost:4200/
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
