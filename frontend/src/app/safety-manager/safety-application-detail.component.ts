import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-safety-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './safety-application-detail.component.html',
  styleUrls: [
    '../sectional-manager/application-detail.component.scss',
    './safety-application-detail.component.scss'
  ]
})
export class SafetyApplicationDetailComponent implements OnInit, OnDestroy {
  user: User | null = null;
  application: Application | null = null;

  remarks = '';

  showRejectModal = false;
  rejectReason = '';

  successMessage = '';
  errorMessage = '';

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  failedAttachments: { [key: string]: boolean } = {};
  attachmentsExpanded = true;

  orientationForm = {
    classDate: '',
    classRoom: '',
    trainer: ''
  };

  practicalForm = {
    date: '',
    trainer: ''
  };

  availableClassRooms = ['Room 01', 'Room 02', 'Training Hall'];
  trainerOptions = ['Officer Jayasinghe', 'Officer Seneviratne', 'Trainer Perera'];

  private timeUpdateInterval: any;
  timeUpdateTrigger = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private applicationsService: ApplicationsService
  ) {}

  get vehicleCategories() {
    return this.applicationsService.vehicleCategories;
  }

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
        this.remarks = this.application.safetyRemarks || '';
        if (this.application.orientation) {
          this.orientationForm = {
            classDate: this.application.orientation.classDate || '',
            classRoom: this.application.orientation.classRoom || '',
            trainer: this.application.orientation.trainer || ''
          };
        }
        if (this.application.practical) {
          this.practicalForm = {
            date: this.application.practical.date || '',
            trainer: this.application.practical.trainer || ''
          };
        }
      }
    }

    if (!this.application) {
      this.router.navigate(['/safety-manager/requests']);
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

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  get isSafetyPending(): boolean {
    return !!this.application && this.application.status === 'approved_sectional';
  }

  get isSafetyReview(): boolean {
    return !!this.application && this.application.status === 'pending_safety';
  }

  get isOrientationAssigned(): boolean {
    return !!this.application && this.application.status === 'orientation_assigned';
  }

  get isOrientationCompleted(): boolean {
    return !!this.application && this.application.status === 'orientation_completed';
  }

  get isPracticalAssigned(): boolean {
    return !!this.application && this.application.status === 'practical_assigned';
  }

  get isPracticalCompleted(): boolean {
    return !!this.application && this.application.status === 'practical_completed';
  }

  get isMedicalPending(): boolean {
    return !!this.application && this.application.status === 'medical_pending';
  }

  get isMedicalCompleted(): boolean {
    return !!this.application && this.application.status === 'medical_completed';
  }

  get isDoctorApproved(): boolean {
    return !!this.application && this.application.status === 'doctor_approved';
  }

  get isLicenseIssued(): boolean {
    return !!this.application && this.application.status === 'license_issued';
  }

  get isSafetyRejected(): boolean {
    return this.application?.status === 'rejected_safety';
  }

  get canAssignOrientation(): boolean {
    return !!this.application && ['approved_sectional', 'pending_safety', 'approved_safety', 'orientation_assigned', 'orientation_completed', 'practical_assigned', 'practical_completed'].includes(this.application.status);
  }

  get canAssignPractical(): boolean {
    return !!this.application && this.application.orientation?.status === 'completed';
  }

  get canSendToMedical(): boolean {
    return !!this.application && this.application.practical?.status === 'completed';
  }

  toggleAttachments(): void {
    this.attachmentsExpanded = !this.attachmentsExpanded;
  }

  showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.closeToast(), 4000);
  }

  closeToast(): void {
    this.showToast = false;
    this.toastMessage = '';
  }

  acceptApplication(): void {
    if (!this.application || !this.user) return;
    const success = this.applicationsService.acceptApplicationSafety(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      this.remarks
    );

    if (success) {
      console.log('Email: Attachments accepted - notifying applicant for', this.application.applicantName, this.application.referenceNumber);
      this.successMessage = 'Application validated successfully. Email sent to applicant.';
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to update application.';
    }
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  confirmReject(): void {
    if (!this.application || !this.user || !this.rejectReason.trim()) return;

    const success = this.applicationsService.rejectApplicationSafety(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      this.rejectReason.trim()
    );

    this.showRejectModal = false;

    if (success) {
      console.log('Email: Attachments rejected - notifying applicant for', this.application.applicantName, this.application.referenceNumber);
      this.successMessage = 'Application rejected. Email sent to applicant.';
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.errorMessage = 'Failed to reject application.';
    }
  }

  assignOrientation(): void {
    if (!this.application || !this.user) return;
    const { classDate, classRoom, trainer } = this.orientationForm;
    if (!classDate || !classRoom || !trainer) {
      this.showToastMessage('Fill all classroom fields before assigning.', 'error');
      return;
    }

    const success = this.applicationsService.assignOrientation(
      this.application.id,
      this.user.staffNumber,
      { classDate, classRoom, trainer, remarks: this.remarks }
    );

    if (success) {
      console.log('Email: Orientation assigned to applicant', this.application.applicantName, this.application.referenceNumber, 'trainer:', this.orientationForm.trainer);
      this.showToastMessage('Classroom assignment saved. Email sent to applicant and instructor.');
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.showToastMessage('Unable to assign classroom', 'error');
    }
  }

  markOrientation(status: 'completed' | 'not_completed'): void {
    if (!this.application) return;
    const success = this.applicationsService.updateOrientationStatus(
      this.application.id,
      status,
      status === 'not_completed' ? this.remarks : undefined
    );

    if (success) {
      console.log('Email: Orientation', status, 'notification for', this.application.applicantName, this.application.referenceNumber);
      this.showToastMessage('Orientation status updated. Email sent to applicant.');
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.showToastMessage('Unable to update orientation status', 'error');
    }
  }

  assignPractical(): void {
    if (!this.application) return;
    if (!this.canAssignPractical) {
      this.showToastMessage('Complete orientation before scheduling practical.', 'error');
      return;
    }
    const { date, trainer } = this.practicalForm;
    if (!date || !trainer) {
      this.showToastMessage('Practical test requires a date and trainer.', 'error');
      return;
    }

    const success = this.applicationsService.assignPractical(this.application.id, {
      date,
      trainer,
      remarks: this.remarks
    });

    if (success) {
      console.log('Email: Practical assigned to applicant', this.application.applicantName, this.application.referenceNumber, 'trainer:', this.practicalForm.trainer);
      this.showToastMessage('Practical assignment saved. Email sent to applicant and trainer.');
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.showToastMessage('Unable to assign practical test', 'error');
    }
  }

  markPractical(status: 'completed' | 'not_completed'): void {
    if (!this.application) return;
    const success = this.applicationsService.updatePracticalStatus(
      this.application.id,
      status,
      status === 'not_completed' ? this.remarks : undefined
    );

    if (success) {
      console.log('Email: Practical', status, 'notification for', this.application.applicantName, this.application.referenceNumber);
      this.showToastMessage('Practical status updated. Email sent to applicant.');
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.showToastMessage('Unable to update practical status', 'error');
    }
  }

  sendToMedical(): void {
    if (!this.application || !this.canSendToMedical) {
      this.showToastMessage('Complete practical training before sending to medical.', 'error');
      return;
    }

    const success = this.applicationsService.sendForMedical(
      this.application.id,
      new Date().toISOString()
    );

    if (success) {
      this.showToastMessage('Application forwarded to medical unit');
      this.application = this.applicationsService.getApplicationById(this.application.id) || null;
    } else {
      this.showToastMessage('Unable to forward application', 'error');
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
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  goBack(): void {
    this.router.navigate(['/safety-manager/requests']);
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

  get historyItems() {
    if (!this.application) return [];
    const items: Array<{ actor: string; role: string; staffId?: string; date?: string; message?: string }> = [];

    items.push({
      actor: this.application.applicantName,
      role: 'User',
      staffId: this.application.staffNumber,
      date: this.application.submittedDate,
      message: 'Request sent'
    });

    if (this.application.sectionalManagerName && this.application.sectionalApprovalDate) {
      let message = 'Reviewed request';
      if (this.application.status === 'approved_sectional') {
        message = 'Accepted request';
      } else if (this.application.status === 'rejected_sectional') {
        message = 'Rejected request';
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

    if (this.application.safetyManagerName && this.application.safetyApprovalDate) {
      let message = 'Reviewed request';
      if (this.application.status === 'pending_safety') {
        message = 'Validated attachments';
      } else if (this.application.status === 'rejected_safety') {
        message = 'Rejected request';
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

    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    return items;
  }
}
