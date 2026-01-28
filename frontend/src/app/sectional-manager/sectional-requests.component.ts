import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

type RequestsTab = 'all' | 'newext' | 'ongoing';

type Mode = 'requests' | 'rejected';

@Component({
  selector: 'app-sectional-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './sectional-requests.component.html',
  styleUrls: ['./sectional-requests.component.scss']
})
export class SectionalRequestsComponent implements OnInit {
  user: User | null = null;
  applications: Application[] = [];
  filteredApplications: Application[] = [];

  // Search & tabs
  searchTerm = '';
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

    // Search by reference, name, staff, department
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(a =>
        a.referenceNumber.toLowerCase().includes(term) ||
        a.applicantName.toLowerCase().includes(term) ||
        a.staffNumber.toLowerCase().includes(term) ||
        a.department.toLowerCase().includes(term)
      );
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

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
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

  getTitle(): string {
    return this.mode === 'rejected' ? 'Rejected Applicants' : 'Applicants';
  }

  getTabLabel(tab: RequestsTab): string {
    switch (tab) {
      case 'all':
        return 'All';
      case 'newext':
        return 'New / Ext';
      case 'ongoing':
        return 'On going';
    }
  }

  getItemIndex(i: number): number {
    return (this.currentPage - 1) * this.pageSize + i + 1;
  }
}
