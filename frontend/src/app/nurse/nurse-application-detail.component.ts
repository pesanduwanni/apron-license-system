import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import {
  Application,
  ApplicationsService,
  MedicalTestResult
} from '../services/applications.service';

@Component({
  selector: 'app-nurse-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nurse-application-detail.component.html',
  styleUrls: ['../sectional-manager/application-detail.component.scss', './nurse-application-detail.component.scss']
})
export class NurseApplicationDetailComponent implements OnInit {
  user: User | null = null;
  application: Application | null = null;

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  showPreviewModal = false;
  previewUrl = '';
  previewTitle = '';

  failedAttachments: { [key: string]: boolean } = {};
  attachmentsExpanded = false;

  medicalForm: {
    eyesight: MedicalTestResult | '';
    colourBlindness: MedicalTestResult | '';
    generalHealth: MedicalTestResult | '';
    eyesightRemark: string;
    colourBlindnessRemark: string;
    generalHealthRemark: string;
    comment: string;
  } = {
    eyesight: '',
    colourBlindness: '',
    generalHealth: '',
    eyesightRemark: '',
    colourBlindnessRemark: '',
    generalHealthRemark: '',
    comment: ''
  };

  get isMedicalComplete(): boolean {
    return !!(this.medicalForm.eyesight && this.medicalForm.colourBlindness && this.medicalForm.generalHealth);
  }

  get medicalOutcome(): 'accepted' | 'rejected' | null {
    if (!this.isMedicalComplete) return null;
    if (
      this.medicalForm.eyesight === 'failed' ||
      this.medicalForm.colourBlindness === 'failed' ||
      this.medicalForm.generalHealth === 'failed'
    ) {
      return 'rejected';
    }
    return 'accepted';
  }

  get isReadOnly(): boolean {
    return this.application?.status !== 'medical_pending';
  }

  get isRejected(): boolean {
    return (
      this.application?.medicalTest?.eyesight === 'failed' ||
      this.application?.medicalTest?.colourBlindness === 'failed' ||
      this.application?.medicalTest?.generalHealth === 'failed'
    );
  }

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

    // Fallback: some flows update practical status without trainer.result
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

    const appId = this.route.snapshot.paramMap.get('id');
    if (appId) {
      this.application = this.applicationsService.getApplicationById(appId) || null;
    }

    if (!this.application) {
      this.router.navigate(['/nurse/requests']);
      return;
    }

    const canAccessPending = this.application.status === 'medical_pending';
    const canAccessCompletedByMe =
      this.application.status === 'medical_completed' &&
      (this.application.medicalTest?.nurseId || '') === this.user.staffNumber;

    if (!canAccessPending && !canAccessCompletedByMe) {
      this.router.navigate(['/nurse/requests']);
      return;
    }

    if (this.application.medicalTest) {
      this.medicalForm = {
        eyesight: this.application.medicalTest.eyesight || '',
        colourBlindness: this.application.medicalTest.colourBlindness || '',
        generalHealth: this.application.medicalTest.generalHealth || '',
        eyesightRemark: this.application.medicalTest.eyesightRemarks || '',
        colourBlindnessRemark: this.application.medicalTest.colourBlindnessRemarks || '',
        generalHealthRemark: this.application.medicalTest.generalHealthRemarks || '',
        comment: this.application.medicalTest.remarks || ''
      };
    }

    this.subscriptions.add(
      this.applicationsService.applications$.subscribe(() => {
        if (!this.application) return;
        this.application =
          this.applicationsService.getApplicationById(this.application.id) || null;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.router.navigate(['/nurse/requests']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  formatWorkflowDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';

    // Prefer YYYY-MM-DD as shown in the UI mock/screenshot.
    // If incoming is already YYYY-MM-DD or ISO, just take the date portion.
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

  setMedicalResult(
    key: 'eyesight' | 'colourBlindness' | 'generalHealth',
    value: MedicalTestResult
  ): void {
    if (this.isReadOnly) return;
    this.medicalForm[key] = value;
  }

  submitMedical(): void {
    if (!this.user || !this.application) return;

    if (this.isReadOnly) {
      return;
    }

    const eyesight = this.medicalForm.eyesight;
    const colourBlindness = this.medicalForm.colourBlindness;
    const generalHealth = this.medicalForm.generalHealth;

    if (!eyesight || !colourBlindness || !generalHealth) {
      this.showToastMessage('Please complete all medical test fields before proceeding.', 'error');
      return;
    }

    const success = this.applicationsService.submitMedicalTest(
      this.application.id,
      this.user.staffNumber,
      this.user.name,
      {
        eyesight,
        colourBlindness,
        generalHealth,
        eyesightRemarks: this.medicalForm.eyesightRemark?.trim() || undefined,
        colourBlindnessRemarks: this.medicalForm.colourBlindnessRemark?.trim() || undefined,
        generalHealthRemarks: this.medicalForm.generalHealthRemark?.trim() || undefined,
        remarks: this.medicalForm.comment?.trim() || undefined
      }
    );

    if (!success) {
      this.showToastMessage('Unable to submit medical test. Please try again.', 'error');
      return;
    }

    this.showToastMessage('Medical test submitted successfully.');
    setTimeout(() => this.router.navigate(['/nurse/requests']), 700);
  }
}
