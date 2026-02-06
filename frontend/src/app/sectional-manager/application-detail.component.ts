import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnInit {
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
  attachmentsExpanded = true;

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
      // show a small top-right toast for category updates
      this.showToastMessage('You have updated equipment type / Vehicle successfully', 'success');
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
      this.successMessage = 'Application rejected. Email notification sent to applicant.';
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

  getTimeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs <= 0) return '0m';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) return `${diffDays}d`;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours >= 1) return `${diffHours}h`;

    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMinutes}m`;
  }

  // Build a simple history/timeline from available application fields
  get historyItems() {
    if (!this.application) return [];
    const items: Array<{ actor: string; role: string; staffId?: string; date?: string; message?: string }>
      = [];

    // Applicant submission
    items.push({
      actor: this.application.applicantName,
      role: 'User',
      staffId: this.application.staffNumber,
      date: this.application.submittedDate,
      message: 'Request sent'
    });

    // Sectional manager action (if present)
    if (this.application.sectionalManagerName && this.application.sectionalApprovalDate) {
      const approved = this.application.approvedCategories || [];
      const original = this.application.selectedCategories || [];
      const changed =
        approved.length !== original.length ||
        approved.some((k) => !original.includes(k));

      let message = '';

      if (this.application.status === 'approved_sectional') {
        message = 'Accepted request';
      } else if (this.application.status === 'rejected_sectional') {
        message = 'Rejected request';
      } else if (changed) {
        message = 'Updated equipment recommendation';
      } else {
        message = 'Reviewed request';
      }

      if (this.application.sectionalRemarks) {
        message += ` – ${this.application.sectionalRemarks}`;
      }

      items.push({
        actor: this.application.sectionalManagerName,
        role: 'Sectional Manager',
        staffId: this.application.sectionalManagerId,
        date: this.application.sectionalApprovalDate,
        message
      });
    }

    // Safety manager action (if present)
    if (this.application.safetyManagerName && this.application.safetyApprovalDate) {
      let message = '';

      if (this.application.status === 'approved_safety') {
        message = 'Accepted request';
      } else if (this.application.status === 'rejected_safety') {
        message = 'Rejected request';
      } else {
        message = 'Reviewed request';
      }

      if (this.application.safetyRemarks) {
        message += ` – ${this.application.safetyRemarks}`;
      }

      items.push({
        actor: this.application.safetyManagerName,
        role: 'Safety Manager',
        staffId: this.application.safetyManagerId,
        date: this.application.safetyApprovalDate,
        message
      });
    }

    // Sort newest first by date if available
    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return items;
  }

  toggleAttachments() {
    this.attachmentsExpanded = !this.attachmentsExpanded;
  }
}
