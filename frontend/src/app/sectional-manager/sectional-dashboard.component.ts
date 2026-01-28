import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-sectional-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sectional-dashboard.component.html',
  styleUrls: ['./sectional-dashboard.component.scss']
})
export class SectionalDashboardComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  constructor(
    private authService: AuthService,
    private applicationsService: ApplicationsService,
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

  get initials(): string {
    if (!this.user) return '';
    return this.user.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  loadApplications(): void {
    if (!this.user) return;

    this.applications = this.applicationsService.getApplicationsForSectionalManager(
      this.user.staffNumber
    );
    // Sort by most recent for the dashboard's "recent" list
    this.filteredApplications = [...this.applications].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending_sectional':
        return 'Pending Review';
      case 'approved_sectional':
        return 'Approved';
      case 'rejected_sectional':
        return 'Rejected';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending_sectional':
        return 'pending';
      case 'approved_sectional':
        return 'approved';
      case 'rejected_sectional':
        return 'rejected';
      default:
        return '';
    }
  }

  get pendingCount(): number {
    return this.applications.filter(a => a.status === 'pending_sectional').length;
  }

  get approvedCount(): number {
    return this.applications.filter(a => a.status === 'approved_sectional').length;
  }

  get rejectedCount(): number {
    return this.applications.filter(a => a.status === 'rejected_sectional').length;
  }

  navigateToTab(tab: 'pending' | 'approved' | 'rejected' | 'all'): void {
    // Navigate into the Requests page and let it handle filtering
    if (tab === 'rejected') {
      this.router.navigate(['/sectional-manager/rejected']);
    } else {
      this.router.navigate(['/sectional-manager/requests']);
    }
  }

  goToRequests(): void {
    this.router.navigate(['/sectional-manager/requests']);
  }
}
