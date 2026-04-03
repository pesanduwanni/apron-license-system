import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService, SummaryGroup } from '../services/applications.service';

@Component({
  selector: 'app-doctor-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-application-detail.component.html',
  styleUrls: ['../sectional-manager/application-detail.component.scss', './doctor-application-detail.component.scss']
})
export class DoctorApplicationDetailComponent implements OnInit, OnDestroy {
  user: User | null = null;
  application: Application | null = null;

  successMessage = '';
  errorMessage = '';
  private successRedirectUrl: string | null = null;

  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  failedAttachments: { [key: string]: boolean } = {};
  attachmentsExpanded = false;

  fitSelection: 'fit' | 'not_fit' | '' = '';
  remarks = '';

  private timeUpdateInterval: any;
  timeUpdateTrigger = 0;

  private collapsedSummaryGroupKeys = new Set<string>();

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private applicationsService: ApplicationsService
  ) {}

  get vehicleCategories() {
    return this.applicationsService.vehicleCategories;
  }

  get trainerOutcome(): 'pass' | 'fail' | null {
    if (!this.application) return null;
    if (this.application.trainer?.result) return this.application.trainer.result;

    const practicalStatus = this.application.practical?.status;
    if (practicalStatus === 'completed') return 'pass';
    if (practicalStatus === 'not_completed') return 'fail';
    return null;
  }

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/doctor/requests']);
      return;
    }

    this.subscriptions.add(
      this.applicationsService.applications$.subscribe(() => {
        this.application = this.applicationsService.getApplicationById(id) || null;
        this.initializeFormFromApplication();
      })
    );

    this.application = this.applicationsService.getApplicationById(id) || null;
    this.initializeFormFromApplication();

    this.timeUpdateInterval = setInterval(() => {
      this.timeUpdateTrigger++;
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.subscriptions.unsubscribe();
  }

  get summaryGroups(): SummaryGroup[] {
    if (!this.application) return [];
    return this.applicationsService.buildSummaryGroups(this.application);
  }

  private summaryGroupKey(group: SummaryGroup): string {
    const staffPart = (group.staffId || '').trim() ? group.staffId : group.actor;
    return `${group.role}|${staffPart}`;
  }

  isSummaryGroupExpanded(group: SummaryGroup): boolean {
    return !this.collapsedSummaryGroupKeys.has(this.summaryGroupKey(group));
  }

  toggleSummaryGroup(group: SummaryGroup): void {
    const key = this.summaryGroupKey(group);
    if (this.collapsedSummaryGroupKeys.has(key)) {
      this.collapsedSummaryGroupKeys.delete(key);
    } else {
      this.collapsedSummaryGroupKeys.add(key);
    }
  }

  toggleAttachments(): void {
    this.attachmentsExpanded = !this.attachmentsExpanded;
  }

  previewAttachment(url: string, title: string): void {
    if ((url || '').startsWith('data:application/pdf') || (url || '').toLowerCase().endsWith('.pdf')) {
      window.open(url, '_blank');
      return;
    }

    this.previewUrl = url;
    this.previewTitle = title;
    this.showPreviewModal = true;
  }

  imageError(key: string): void {
    this.failedAttachments[key] = true;
  }

  imageLoaded(key: string): void {
    if (this.failedAttachments[key]) {
      delete this.failedAttachments[key];
    }
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewUrl = '';
    this.previewTitle = '';
  }

  downloadAttachment(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  get isReadOnly(): boolean {
    const s = this.application?.status;
    if (!s) return true;
    return s !== 'medical_completed';
  }

  private initializeFormFromApplication(): void {
    const review = this.application?.doctorReview;
    if (review?.fit === true) {
      this.fitSelection = 'fit';
    } else if (review?.fit === false) {
      this.fitSelection = 'not_fit';
    }

    this.remarks = review?.remarks || '';
  }

  selectFit(value: 'fit' | 'not_fit'): void {
    if (this.isReadOnly) return;
    this.fitSelection = value;
  }

  accept(): void {
    this.submit(true);
  }

  reject(): void {
    this.submit(false);
  }

  private submit(fit: boolean): void {
    if (!this.user || !this.application) return;
    if (this.isReadOnly) return;

    this.fitSelection = fit ? 'fit' : 'not_fit';

    const success = this.applicationsService.submitDoctorDecision(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      fit,
      this.remarks?.trim() || undefined
    );

    if (!success) {
      this.errorMessage = 'Unable to submit doctor decision. Please try again.';
      return;
    }

    this.successMessage = fit
      ? 'Task Updated and Sent to next level Successfully'
      : 'Application rejected successfully.';
    this.successRedirectUrl = '/doctor/requests';

    this.application = this.applicationsService.getApplicationById(this.application.id) || null;
  }

  closeAlert(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.successRedirectUrl) {
      const url = this.successRedirectUrl;
      this.successRedirectUrl = null;
      this.router.navigate([url]);
    }
  }

  goBack(): void {
    this.router.navigate(['/doctor/requests']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';

    if (dateStr.length >= 10) {
      const head = dateStr.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatWorkflowDate(dateStr: string | undefined): string {
    return this.formatDate(dateStr);
  }

  getTimeAgo(dateStr?: string, trigger?: number): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs <= 0) return '0s';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) return `${diffDays}d`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours >= 1) return `${diffHours}h`;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes >= 1) return `${diffMinutes}m`;

    const diffSeconds = Math.floor(diffMs / 1000);
    return `${diffSeconds}s`;
  }
}
