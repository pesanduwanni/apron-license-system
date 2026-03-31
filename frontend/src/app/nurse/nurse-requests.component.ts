import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

type Mode = 'requests' | 'rejected';

@Component({
  selector: 'app-nurse-requests',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './nurse-requests.component.html',
  styleUrls: ['../sectional-manager/sectional-requests.component.scss', './nurse-requests.component.scss']
})
export class NurseRequestsComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  private readonly subscriptions = new Subscription();

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  searchTerm = '';
  sortOrder: 'desc' | 'asc' = 'desc';

  mode: Mode = 'requests';

  constructor(
    private authService: AuthService,
    private appsService: ApplicationsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.mode = (this.route.snapshot.data['mode'] as Mode) || 'requests';

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

    if (this.mode === 'requests') {
      this.applications = this.appsService.getApplicationsForNurse();
    } else {
      const nurseId = this.user.staffNumber;
      this.applications = this.appsService
        .getApplications()
        .filter(app => app.status === 'medical_completed')
        .filter(app => (app.medicalTest?.nurseId || '') === nurseId)
        .filter(app => this.isMedicalRejected(app));
    }

    this.applyFilters();
  }

  isMedicalRejected(app: Application): boolean {
    return (
      app.medicalTest?.eyesight === 'failed' ||
      app.medicalTest?.colourBlindness === 'failed' ||
      app.medicalTest?.generalHealth === 'failed'
    );
  }

  applyFilters(): void {
    let result = [...this.applications];

    const q = this.searchTerm?.trim().toLowerCase();
    if (q) {
      result = result.filter(a =>
        (a.referenceNumber || '').toLowerCase().includes(q) ||
        (a.applicantName || '').toLowerCase().includes(q) ||
        (a.staffNumber || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const da = new Date(
        this.mode === 'rejected'
          ? a.medicalTest?.submittedDate || a.medical?.assignedDate || a.submittedDate
          : a.medical?.assignedDate || a.submittedDate
      ).getTime();
      const db = new Date(
        this.mode === 'rejected'
          ? b.medicalTest?.submittedDate || b.medical?.assignedDate || b.submittedDate
          : b.medical?.assignedDate || b.submittedDate
      ).getTime();
      return this.sortOrder === 'desc' ? db - da : da - db;
    });

    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredApplications = result.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  viewApplication(app: Application): void {
    this.router.navigate(['/nurse/application', app.id]);
  }

  getChipLabel(app: Application): string {
    if (this.mode === 'rejected') return 'Rejected';
    return 'Pending';
  }

  getChipClass(app: Application): string {
    if (this.mode === 'rejected') return 'rejected';
    return 'new';
  }

  getDisplayDate(app: Application): string {
    if (this.mode === 'rejected') {
      return app.medicalTest?.submittedDate || app.medical?.assignedDate || app.submittedDate;
    }
    return app.medical?.assignedDate || app.submittedDate;
  }

  getDisplayDateLabel(): string {
    return this.mode === 'rejected' ? 'Submitted date' : 'Assigned date';
  }

  getItemIndex(i: number): number {
    return (this.currentPage - 1) * this.pageSize + i + 1;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push(-1);
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1);
      }

      pages.push(total);
    }

    return pages;
  }
}
