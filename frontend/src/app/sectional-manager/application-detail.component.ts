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

  // Preview modal
  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  // Equipment edit modal
  showEquipmentEditModal = false;

  // Track images that failed to load so we can show placeholders instead
  failedAttachments: { [key: string]: boolean } = {};

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
    if (!this.application || !this.isPending) return;

    const success = this.applicationsService.updateCategories(
      this.application.id,
      [...this.editedCategories],
      this.remarks
    );

    if (success) {
      this.successMessage = 'Categories updated successfully.';
      setTimeout(() => (this.successMessage = ''), 3000);
      // Reload application
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to update categories.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
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
    this.showConfirmModal = true;
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
      this.successMessage = 'Application approved successfully. Email notification sent to applicant and Safety Manager.';
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
}
