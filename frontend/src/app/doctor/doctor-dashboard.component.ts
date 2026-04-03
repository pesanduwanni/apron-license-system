import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  pendingCount = 0;

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

  private loadApplications(): void {
    this.applications = this.appsService.getApplicationsForDoctor();
    this.pendingCount = this.applications.length;

    this.filteredApplications = [...this.applications].sort((a, b) => {
      const da = new Date(a.medicalTest?.submittedDate || a.submittedDate).getTime();
      const db = new Date(b.medicalTest?.submittedDate || b.submittedDate).getTime();
      return db - da;
    });
  }

  goToRequests(): void {
    this.router.navigate(['/doctor/requests']);
  }

  viewApplication(app: Application): void {
    this.router.navigate(['/doctor/application', app.id]);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}
