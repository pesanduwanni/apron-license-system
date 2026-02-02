import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

type RequestsTab = 'all' | 'newext' | 'ongoing';

type Mode = 'requests' | 'rejected';

@Component({
  selector: 'app-sectional-requests',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './sectional-requests.component.html',
  styleUrls: ['./sectional-requests.component.scss']
})
export class SectionalRequestsComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  // Tabs
  activeTab: RequestsTab = 'all';
  mode: Mode = 'requests';

  // Pagination
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;

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

    const all = this.appsService.getApplicationsForSectionalManager(this.user.staffNumber);

    if (this.mode === 'requests') {
      // All non-rejected applications
      this.applications = all.filter(a => a.status !== 'rejected_sectional');
    } else {
      // Rejected view
      this.applications = all.filter(a => a.status === 'rejected_sectional');
    }

    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.applications];

    if (this.mode === 'requests') {
      // Tab filters
      if (this.activeTab === 'newext') {
        result = result.filter(a => a.status === 'pending_sectional');
      } else if (this.activeTab === 'ongoing') {
        result = result.filter(a => a.status === 'approved_sectional');
      }
    }

    // Sort by submitted date desc (like design)
    result.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());

    // Pagination
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
    this.router.navigate(['/sectional-manager/application', app.id]);
  }

  getChipLabel(app: Application): string {
    if (app.status === 'approved_sectional') {
      return 'On going';
    }
    if (app.status === 'rejected_sectional') {
      return 'Rejected';
    }

    // pending
    return app.licenseType === 'extension' ? 'Extension' : 'New';
  }

  getChipClass(app: Application): string {
    if (app.status === 'approved_sectional') {
      return 'ongoing';
    }
    if (app.status === 'rejected_sectional') {
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
        pages.push(-1); // ellipsis
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 2) {
        pages.push(-1); // ellipsis
      }
      
      pages.push(total);
    }
    
    return pages;
  }
}
