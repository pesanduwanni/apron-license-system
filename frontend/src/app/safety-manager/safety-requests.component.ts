import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

type RequestsTab = 'all' | 'newext' | 'ongoing';

type Mode = 'requests' | 'rejected';

@Component({
  selector: 'app-safety-requests',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './safety-requests.component.html',
  styleUrls: [
    '../sectional-manager/sectional-requests.component.scss',
    './safety-requests.component.scss'
  ]
})
export class SafetyRequestsComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  activeTab: RequestsTab = 'all';
  mode: Mode = 'requests';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  // search & sort
  searchTerm = '';
  sortOrder: 'desc' | 'asc' = 'desc';

  constructor(
    private authService: AuthService,
    private appsService: ApplicationsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.mode = (this.route.snapshot.data['mode'] as Mode) || 'requests';
    this.loadApplications();
  }

  loadApplications(): void {
    if (!this.user) return;
    const all = this.appsService.getApplicationsForSafetyManager(this.user.staffNumber);

    if (this.mode === 'requests') {
      this.applications = all.filter(app => app.status !== 'rejected_safety');
    } else {
      this.applications = all.filter(app => app.status === 'rejected_safety');
    }

    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.applications];

    // search
    const q = this.searchTerm?.trim().toLowerCase();
    if (q) {
      result = result.filter(a =>
        (a.referenceNumber || '').toLowerCase().includes(q) ||
        (a.applicantName || '').toLowerCase().includes(q) ||
        (a.staffNumber || '').toLowerCase().includes(q)
      );
    }

    if (this.mode === 'requests') {
      if (this.activeTab === 'newext') {
        result = result.filter(app => ['approved_sectional', 'pending_safety'].includes(app.status));
      } else if (this.activeTab === 'ongoing') {
        result = result.filter(app =>
          ['orientation_assigned', 'orientation_completed', 'practical_assigned', 'practical_completed', 'medical_pending', 'medical_completed'].includes(app.status)
        );
      }
    }

    result.sort((a, b) => {
      const da = new Date(a.submittedDate).getTime();
      const db = new Date(b.submittedDate).getTime();
      return this.sortOrder === 'desc' ? db - da : da - db;
    });

    this.totalPages = Math.ceil(result.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredApplications = result.slice(start, start + this.pageSize);
  }

  setTab(tab: RequestsTab): void {
    if (this.mode === 'rejected') return;
    this.activeTab = tab;
    this.currentPage = 1;
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }

  viewApplication(app: Application): void {
    this.router.navigate(['/safety-manager/application', app.id]);
  }

  getChipLabel(app: Application): string {
    switch (app.status) {
      case 'approved_sectional':
      case 'pending_safety':
        // At this stage the application has been forwarded to safety by sectional manager
        // show the license type (New / Extension) instead of "On going"
        return app.licenseType === 'extension' ? 'Extension' : 'New';
      case 'approved_safety':
        // Safety manager accepted — now the workflow is ongoing
        return 'On going';
      case 'orientation_assigned':
        return 'Orientation Assigned';
      case 'orientation_completed':
        return 'Orientation Done';
      case 'practical_assigned':
        return 'Practical Assigned';
      case 'practical_completed':
        return 'Practical Done';
      case 'medical_pending':
        return 'Medical Pending';
      case 'medical_completed':
        return 'Medical Completed';
      case 'rejected_safety':
        return 'Rejected';
      default:
        return app.licenseType === 'extension' ? 'Extension' : 'New';
    }
  }

  getChipClass(app: Application): string {
    // Ongoing only after safety manager has accepted (approved_safety) or later workflow stages
    if (app.status === 'approved_safety' ||
        app.status === 'orientation_assigned' ||
        app.status === 'orientation_completed' ||
        app.status === 'practical_assigned' ||
        app.status === 'practical_completed' ||
        app.status === 'medical_pending' ||
        app.status === 'medical_completed' ||
        app.status === 'doctor_approved' ||
        app.status === 'license_issued') {
      return 'ongoing';
    }
    if (app.status === 'rejected_safety') {
      return 'rejected';
    }
    if (app.licenseType === 'extension') {
      return 'extension';
    }
    return 'new';
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
