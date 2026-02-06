import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-safety-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './safety-dashboard.component.html',
  styleUrls: [
    '../sectional-manager/sectional-dashboard.component.scss',
    './safety-dashboard.component.scss'
  ]
})
export class SafetyDashboardComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  constructor(
    private authService: AuthService,
    private appsService: ApplicationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadApplications();
  }

  loadApplications(): void {
    if (!this.user) return;
    this.applications = this.appsService.getApplicationsForSafetyManager(this.user.staffNumber);
    this.filteredApplications = [...this.applications].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
  }

  get pendingCount(): number {
    return this.applications.filter(app =>
      ['approved_sectional', 'pending_safety'].includes(app.status)
    ).length;
  }

  get trainingCount(): number {
    return this.applications.filter(app =>
      ['orientation_assigned', 'orientation_completed', 'practical_assigned', 'practical_completed'].includes(app.status)
    ).length;
  }

  get rejectedCount(): number {
    return this.applications.filter(app => app.status === 'rejected_safety').length;
  }

  get totalCount(): number {
    return this.applications.length;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved_sectional':
        return 'Awaiting validation';
      case 'pending_safety':
        return 'Validating attachments';
      case 'orientation_assigned':
        return 'Classroom assigned';
      case 'orientation_completed':
        return 'Orientation done';
      case 'practical_assigned':
        return 'Practical assigned';
      case 'practical_completed':
        return 'Practical done';
      case 'rejected_safety':
        return 'Rejected';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved_sectional':
      case 'pending_safety':
        return 'pending';
      case 'orientation_assigned':
      case 'orientation_completed':
      case 'practical_assigned':
      case 'practical_completed':
        return 'approved';
      case 'rejected_safety':
        return 'rejected';
      default:
        return '';
    }
  }

  navigateToTab(tab: 'pending' | 'approved' | 'rejected' | 'all'): void {
    if (tab === 'rejected') {
      this.router.navigate(['/safety-manager/rejected']);
    } else {
      this.router.navigate(['/safety-manager/requests']);
    }
  }

  goToRequests(): void {
    this.router.navigate(['/safety-manager/requests']);
  }
}
