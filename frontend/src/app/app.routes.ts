import { Routes } from '@angular/router';
import { ApplicantDashboardComponent } from './applicant/applicant-dashboard.component';
import { applicantGuard } from './guards/applicant.guard';
import { nurseGuard } from './guards/nurse.guard';
import { sectionalManagerGuard } from './guards/sectional-manager.guard';
import { safetyManagerGuard } from './guards/safety-manager.guard';
import { trainerGuard } from './guards/trainer.guard';
import { LoginComponent } from './login/login.component';
import { NurseApplicationDetailComponent } from './nurse/nurse-application-detail.component';
import { NurseDashboardComponent } from './nurse/nurse-dashboard.component';
import { NurseLayoutComponent } from './nurse/nurse-layout.component';
import { NurseRequestsComponent } from './nurse/nurse-requests.component';
import { SectionalLayoutComponent } from './sectional-manager/sectional-layout.component';
import { SectionalDashboardComponent } from './sectional-manager/sectional-dashboard.component';
import { SectionalRequestsComponent } from './sectional-manager/sectional-requests.component';
import { ApplicationDetailComponent } from './sectional-manager/application-detail.component';
import { SafetyLayoutComponent } from './safety-manager/safety-layout.component';
import { SafetyDashboardComponent } from './safety-manager/safety-dashboard.component';
import { SafetyRequestsComponent } from './safety-manager/safety-requests.component';
import { SafetyApplicationDetailComponent } from './safety-manager/safety-application-detail.component';
import { TrainerLayoutComponent } from './trainer/trainer-layout.component';
import { TrainerDashboardComponent } from './trainer/trainer-dashboard.component';
import { TrainerRequestsComponent } from './trainer/trainer-requests.component';
import { TrainerApplicationDetailComponent } from './trainer/trainer-application-detail.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Applicant routes
  {
    path: 'applicant',
    component: ApplicantDashboardComponent,
    canActivate: [applicantGuard]
  },

  // Nurse routes
  {
    path: 'nurse',
    canActivate: [nurseGuard],
    component: NurseLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: NurseDashboardComponent },
      { path: 'requests', component: NurseRequestsComponent },
      { path: 'rejected', component: NurseRequestsComponent, data: { mode: 'rejected' } },
      { path: 'application/:id', component: NurseApplicationDetailComponent }
    ]
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

  // Safety Manager routes
  {
    path: 'safety-manager',
    canActivate: [safetyManagerGuard],
    component: SafetyLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SafetyDashboardComponent },
      { path: 'requests', component: SafetyRequestsComponent, data: { mode: 'requests' } },
      { path: 'rejected', component: SafetyRequestsComponent, data: { mode: 'rejected' } },
      { path: 'application/:id', component: SafetyApplicationDetailComponent }
    ]
  },

  // Trainer routes
  {
    path: 'trainer',
    canActivate: [trainerGuard],
    component: TrainerLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: TrainerDashboardComponent },
      { path: 'requests', component: TrainerRequestsComponent, data: { mode: 'requests' } },
      { path: 'rejected', component: TrainerRequestsComponent, data: { mode: 'rejected' } },
      { path: 'application/:id', component: TrainerApplicationDetailComponent }
    ]
  },

  // Show login immediately when opening http://localhost:4200/
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
