import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-trainer-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-application-detail.component.html',
  styleUrls: [
    '../sectional-manager/application-detail.component.scss',
    './trainer-application-detail.component.scss'
  ]
})
export class TrainerApplicationDetailComponent implements OnInit, OnDestroy {
  user: User | null = null;
  application: Application | null = null;

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  failedAttachments: { [key: string]: boolean } = {};
  attachmentsExpanded = true;

  selectedReportName = '';
  selectedReportFile: File | null = null;
  reportStatusMessage = '';

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
      if (this.application?.trainer) {
        this.reportStatusMessage = this.application.trainer.reportName
          ? `Uploaded report successfully. ${this.application.trainer.reportName}`
          : '';
      }
    }

    // Trainers must only access applications assigned to them for practical training.
    if (this.application && this.user) {
      const assignedTrainer = this.application.practical?.trainer;
      if (!assignedTrainer || assignedTrainer !== this.user.name) {
        this.router.navigate(['/trainer/requests']);
        return;
      }
    }

    if (!this.application) {
      this.router.navigate(['/trainer/requests']);
    }

    this.timeUpdateInterval = setInterval(() => {
      this.timeUpdateTrigger++;
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  get sectionalApprovalStatus(): string {
    if (!this.application) return 'Pending';
    if (this.application.status === 'rejected_sectional') return 'Rejected';
    if (this.application.sectionalApprovalDate) return 'Approved';
    return 'Pending';
  }

  get today(): string {
    return new Date().toISOString();
  }

  get safetyApprovalStatus(): string {
    if (!this.application) return 'Pending';
    if (this.application.status === 'rejected_safety') return 'Rejected';
    if (this.application.safetyApprovalDate) return 'Approved';
    return 'Pending';
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

  previewAttachment(url: string, title: string): void {
    // For PDFs, open in a new tab (image modal doesn't render PDFs).
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

  goBack(): void {
    this.router.navigate(['/trainer/requests']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
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

  onTrainingReportSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      this.selectedReportFile = null;
      this.selectedReportName = '';
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExt = ['pdf', 'png', 'jpg', 'jpeg'];

    if (!allowedTypes.includes(file.type) && !allowedExt.includes(ext || '')) {
      this.showToastMessage('Only PDF, PNG, or JPG files are allowed.', 'error');
      input.value = '';
      this.selectedReportFile = null;
      this.selectedReportName = '';
      return;
    }

    this.selectedReportFile = file;
    this.selectedReportName = file.name;
  }

  uploadTrainingReport(): void {
    if (!this.selectedReportFile) {
      this.showToastMessage('Please select a training report before uploading.', 'error');
      return;
    }
    if (!this.application) return;

    const file = this.selectedReportFile;
    const name = this.selectedReportName;
    const ext = name.split('.').pop()?.toLowerCase();
    const type: 'pdf' | 'png' | 'jpg' = ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : 'jpg';

    const reader = new FileReader();
    reader.onerror = () => {
      this.showToastMessage('Unable to read the selected file.', 'error');
    };
    reader.onload = () => {
      const url = String(reader.result || '');
      if (!url) {
        this.showToastMessage('Unable to read the selected file.', 'error');
        return;
      }

      const success = this.applicationsService.updateTrainerReport(this.application!.id, {
        name,
        type,
        url
      });

      if (!success) {
        this.showToastMessage('Unable to upload training report.', 'error');
        return;
      }

      this.application = this.applicationsService.getApplicationById(this.application!.id) || null;
      this.reportStatusMessage = `Uploaded report successfully. ${name}`;
      this.showToastMessage('Training report uploaded successfully.');
      this.selectedReportFile = null;
      this.selectedReportName = '';
    };

    reader.readAsDataURL(file);
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
