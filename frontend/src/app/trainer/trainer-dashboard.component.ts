import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: [
    '../sectional-manager/sectional-dashboard.component.scss',
    './trainer-dashboard.component.scss'
  ]
})
export class TrainerDashboardComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  private readonly subscriptions = new Subscription();

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

    this.subscriptions.add(
      this.appsService.applications$.subscribe(() => this.loadApplications())
    );
    this.loadApplications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadApplications(): void {
    if (!this.user) return;
    this.applications = this.appsService.getApplicationsForTrainer(this.user.name);
    this.filteredApplications = [...this.applications].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
  }

  get assignedCount(): number {
    return this.applications.filter(app => app.practical?.status === 'assigned').length;
  }

  get completedCount(): number {
    return this.applications.filter(app => app.practical?.status === 'completed').length;
  }

  get notCompletedCount(): number {
    return this.applications.filter(app => app.practical?.status === 'not_completed').length;
  }

  get totalCount(): number {
    return this.applications.length;
  }

  getStatusLabel(app: Application): string {
    switch (app.practical?.status) {
      case 'assigned':
        return 'Assigned';
      case 'completed':
        return 'Completed';
      case 'not_completed':
        return 'Not completed';
      default:
        return app.status === 'approved_safety' ? 'Approved' : 'Pending';
    }
  }

  getStatusClass(app: Application): string {
    switch (app.practical?.status) {
      case 'assigned':
        return 'pending';
      case 'completed':
        return 'approved';
      case 'not_completed':
        return 'rejected';
      default:
        return app.status === 'approved_safety' ? 'pending' : '';
    }
  }

  navigateToTab(tab: 'assigned' | 'completed' | 'rejected' | 'all'): void {
    if (tab === 'rejected') {
      this.router.navigate(['/trainer/rejected']);
    } else {
      this.router.navigate(['/trainer/requests']);
    }
  }

  goToRequests(): void {
    this.router.navigate(['/trainer/requests']);
  }
}
