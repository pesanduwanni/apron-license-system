import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

type RequestsTab = 'all' | 'assigned' | 'completed';

type Mode = 'requests' | 'rejected';

@Component({
  selector: 'app-trainer-requests',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './trainer-requests.component.html',
  styleUrls: [
    '../sectional-manager/sectional-requests.component.scss',
    './trainer-requests.component.scss'
  ]
})
export class TrainerRequestsComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  activeTab: RequestsTab = 'all';
  mode: Mode = 'requests';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
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
    const all = this.appsService.getApplicationsForTrainer(this.user.name);

    if (this.mode === 'requests') {
      this.applications = all.filter(app => app.practical?.status !== 'not_completed');
    } else {
      this.applications = all.filter(app => app.practical?.status === 'not_completed');
    }

    this.applyFilters();
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

    if (this.mode === 'requests') {
      if (this.activeTab === 'assigned') {
        result = result.filter(app => app.practical?.status === 'assigned');
      } else if (this.activeTab === 'completed') {
        result = result.filter(app => app.practical?.status === 'completed');
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
    this.router.navigate(['/trainer/application', app.id]);
  }

  getChipLabel(app: Application): string {
    switch (app.practical?.status) {
      case 'assigned':
        return 'Assigned';
      case 'completed':
        return 'Completed';
      case 'not_completed':
        return 'Not Completed';
      default:
        return app.status === 'approved_safety' ? 'Approved' : 'Pending';
    }
  }

  getChipClass(app: Application): string {
    switch (app.practical?.status) {
      case 'assigned':
        return 'new';
      case 'completed':
        return 'ongoing';
      case 'not_completed':
        return 'rejected';
      default:
        return app.status === 'approved_safety' ? 'ongoing' : 'new';
    }
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
