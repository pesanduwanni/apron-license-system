import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService, SummaryGroup } from '../services/applications.service';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnInit, OnDestroy {
  user: User | null = null;
  application: Application | null = null;

  // Editable categories
  editedCategories: string[] = [];
  remarks = '';

  // Rejection modal
  showRejectModal = false;
  rejectReason = '';

  // Confirmation modal
  showConfirmModal = false;
  confirmAction: 'approve' | 'reject' | null = null;

  // Success/error messages
  successMessage = '';
  errorMessage = '';

  // Toast (top-right) for quick confirmations like category updates
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Preview modal
  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  // Equipment edit modal
  showEquipmentEditModal = false;

  // Track images that failed to load so we can show placeholders instead
  failedAttachments: { [key: string]: boolean } = {};

  // Attachments section expand/collapse
  attachmentsExpanded = false;

  private timeUpdateInterval: any;
  timeUpdateTrigger = 0;

  private collapsedSummaryGroupKeys = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private applicationsService: ApplicationsService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    const appId = this.route.snapshot.paramMap.get('id');
    if (appId) {
      this.application = this.applicationsService.getApplicationById(appId) || null;
      if (this.application) {
        // Initialize edited categories with approved or selected categories
        this.editedCategories = [
          ...(this.application.approvedCategories || this.application.selectedCategories)
        ];
        this.remarks = this.application.sectionalRemarks || '';
      }
    }

    if (!this.application) {
      this.router.navigate(['/sectional-manager']);
    }

    // Update time ago values every minute for real-time display
    this.timeUpdateInterval = setInterval(() => {
      this.timeUpdateTrigger++;
    }, 60000); // Update every 60 seconds
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
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

  get vehicleCategories() {
    return this.applicationsService.vehicleCategories;
  }

  get isPending(): boolean {
    return this.application?.status === 'pending_sectional';
  }

  get isApproved(): boolean {
    return this.application?.status === 'approved_sectional';
  }

  get isRejected(): boolean {
    return this.application?.status === 'rejected_sectional';
  }

  get isOngoing(): boolean {
    // Consider accepted by sectional manager or forwarded to safety as ongoing
    return !!this.application && (this.application.status === 'approved_sectional' || this.application.status === 'pending_safety');
  }

  get isRejectedStatus(): boolean {
    return !!this.application && (this.application.status === 'rejected_sectional' || this.application.status === 'rejected_safety');
  }

  isCategorySelected(key: string): boolean {
    return this.editedCategories.includes(key);
  }

  isCategoryOriginal(key: string): boolean {
    return this.application?.selectedCategories.includes(key) || false;
  }

  toggleCategory(key: string): void {
    if (!this.isPending) return;

    const idx = this.editedCategories.indexOf(key);
    if (idx > -1) {
      this.editedCategories.splice(idx, 1);
    } else {
      this.editedCategories.push(key);
    }
  }

  updateCategories(): void {
    if (!this.application || !this.isPending || !this.user) return;

    const success = this.applicationsService.updateCategories(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      [...this.editedCategories],
      this.remarks
    );

    if (success) {
      // Determine message: if previously no approved categories, treat as "added"
      const wasEmpty = !(this.application.approvedCategories && this.application.approvedCategories.length);
      const msg = wasEmpty ? 'Categories added' : 'Details Updated Successfully';
      this.showToastMessage(msg, 'success');
      // Reload application
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to update categories.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  showToastMessage(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    // auto-dismiss
    setTimeout(() => this.closeToast(), 4500);
  }

  closeToast(): void {
    this.showToast = false;
    this.toastMessage = '';
  }

  openEquipmentEdit(): void {
    if (!this.isPending) return;
    this.showEquipmentEditModal = true;
  }

  closeEquipmentEdit(): void {
    this.showEquipmentEditModal = false;
  }

  saveEquipmentEdit(): void {
    this.updateCategories();
    this.showEquipmentEditModal = false;
  }

  openApproveConfirm(): void {
    this.confirmAction = 'approve';
    this.confirmApprove();
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeModals(): void {
    this.showConfirmModal = false;
    this.showRejectModal = false;
    this.confirmAction = null;
  }

  confirmApprove(): void {
    if (!this.application || !this.user) return;

    const success = this.applicationsService.approveApplication(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      [...this.editedCategories],
      this.remarks
    );

    this.closeModals();

    if (success) {
      // Frontend-only: simulate email/notification
      // Move to safety pipeline (assign to safety manager) so it's visible to safety
      this.applicationsService.acceptApplicationSafety(this.application.id, 'STF003', 'Nimal Fernando');
      this.successMessage = 'Task Updated and Sent to next level Successfully';
      // Reload application
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to approve application.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  confirmReject(): void {
    if (!this.application || !this.user || !this.rejectReason.trim()) return;

    const success = this.applicationsService.rejectApplication(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      this.rejectReason.trim()
    );

    this.closeModals();

    if (success) {
      this.successMessage = 'Form Rejected. Notification sent to applicant.';
      // Reload application
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to reject application.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  previewAttachment(url: string, title: string): void {
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

  closeAlert(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  downloadAttachment(url: string, filename: string): void {
    // In real app, this would trigger actual download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  goBack(): void {
    this.router.navigate(['/sectional-manager']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
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

  toggleAttachments() {
    this.attachmentsExpanded = !this.attachmentsExpanded;
  }
}
