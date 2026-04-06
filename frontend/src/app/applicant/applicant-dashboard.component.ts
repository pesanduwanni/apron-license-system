import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { ApplicationsService, Application, Attachment } from '../services/applications.service';

type SectionKey = 'basic' | 'personal' | 'license' | 'attachments';

interface RequestHistory {
  id: string;
  submittedOn: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  licenseType: string;
}

interface AttachmentControl {
  key: string;
  label: string;
  accept?: string;
}

interface AttachmentGroup {
  title: string;
  controls: AttachmentControl[];
}

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './applicant-dashboard.component.html',
  styleUrls: ['./applicant-dashboard.component.scss']
})
export class ApplicantDashboardComponent implements OnInit {
  applicantForm: FormGroup;
  collapsedSections: Record<SectionKey, boolean> = {
    basic: false,
    personal: false,
    license: false,
    attachments: false
  };
  showHistory = false;
  formStatus: 'idle' | 'saving' | 'submitted' = 'idle';
  user: User | null = null;

  showLicenseApprovedBanner = false;
  licenseIssuedApplication: Application | null = null;
  private readonly licenseBannerDismissKeyPrefix = 'licenseApprovedBannerDismissed';

  readonly todayIso = this.toIsoDate(new Date());
  readonly tomorrowIso = this.toIsoDate(this.addDays(new Date(), 1));

  private readonly alphaNumMax10 = /^[A-Za-z0-9]{1,10}$/;

  get isAaslValid(): boolean {
    const hasPermit = !!this.applicantForm.get('basicInfo.hasAaslPermit')?.value;
    if (!hasPermit) return false;
    const aaslExpiry = this.applicantForm.get('basicInfo.aaslAccessExpiry')?.value;
    if (!aaslExpiry) return false;
    const expiryDate = new Date(aaslExpiry);
    const now = new Date();
    return expiryDate > now;
  }

  readonly sectionalManagerOptions = [
    { id: 'STF002', name: 'Kamala Silva' }
  ];

  readonly departmentOptions = [
    'Information Technology',
    'IT Projects and Systems',
    'Operations Management',
    'Safety Department',
    'Training Department',
    'Medical Unit',
    'Human Resources',
    'Finance',
    'Engineering'
  ];

  get equipmentOptions() {
    // Use the centralized category keys so all roles (sectional/safety/trainer/etc.)
    // see the same selected categories.
    return this.applicationsService.vehicleCategories;
  }

  readonly attachmentGroups: AttachmentGroup[] = [
    {
      title: 'Staff ID',
      controls: [
        { key: 'staffIdFront', label: 'Front View' },
        { key: 'staffIdBack', label: 'Back View' }
      ]
    },
    {
      title: 'State License',
      controls: [
        { key: 'stateLicenseFront', label: 'Front View' },
        { key: 'stateLicenseBack', label: 'Back View' }
      ]
    },
    {
      title: 'Aviation Pass',
      controls: [
        { key: 'aviationPassFront', label: 'Front View' },
        { key: 'aviationPassBack', label: 'Back View' }
      ]
    },
    {
      title: 'NIC',
      controls: [
        { key: 'nicFront', label: 'Front View' },
        { key: 'nicBack', label: 'Back View' }
      ]
    }
  ];

  readonly signatureControl: AttachmentControl = {
    key: 'signature',
    label: 'Signature',
    accept: '.png,.jpg,.jpeg'
  };

  readonly attachmentRows: AttachmentGroup[][] = [
    this.attachmentGroups.slice(0, 2),
    this.attachmentGroups.slice(2, 4)
  ];

  attachmentNames: Record<string, string> = {};
  attachmentPreviewUrls: Record<string, string> = {};
  attachmentPreviewKinds: Record<string, 'image' | 'pdf' | ''> = {};
  historyEntries: RequestHistory[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private applicationsService: ApplicationsService,
    private router: Router
  ) {
    this.applicantForm = this.fb.group({
      basicInfo: this.fb.group({
        licenseType: ['extension', Validators.required],
        sectionalManagerId: ['STF002', Validators.required],
        currentAdpNo: [''],
        dateOfFirstIssue: [''],
        safetyOrientationDate: ['', Validators.required],
        // must explicitly choose Yes/No
        hasAaslPermit: [null, this.requiredNonNull()],
        aaslAccessNo: [''],
        aaslAccessExpiry: ['']
      }),
      personalInfo: this.fb.group({
        name: [{value: '', disabled: true}, Validators.required],
        staffNumber: [{value: '', disabled: true}, Validators.required],
        designation: [{value: '', disabled: true}, Validators.required],
        department: ['', Validators.required],
        contactNo: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        nic: ['', [Validators.required, Validators.maxLength(12), Validators.pattern(/^[A-Za-z0-9]{1,12}$/)]],
        currentDate: [{value: '', disabled: true}, Validators.required]
      }),
      licenseInfo: this.fb.group({
        stateLicenseNo: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(this.alphaNumMax10)]],
        issueDate: ['', [Validators.required, this.dateNotAfter(this.todayIso)]],
        expiryDate: ['', [Validators.required, this.dateAfter(this.todayIso)]]
      }),
      equipment: this.buildEquipmentGroup(),
      attachments: this.buildAttachmentsGroup()
    });

    this.setupConditionalValidation();
  }

  ngOnInit(): void {
    this.user = this.authService.currentUser;

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.prefillFormValues();

    if (this.user) {
      const applications = this.applicationsService.getApplicationsForApplicant(this.user.staffNumber);

      this.licenseIssuedApplication = applications
        .filter((app) => app.status === 'license_issued')
        .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime())[0] ?? null;

      if (this.licenseIssuedApplication) {
        const dismissKey = `${this.licenseBannerDismissKeyPrefix}:${this.licenseIssuedApplication.referenceNumber}`;
        this.showLicenseApprovedBanner = localStorage.getItem(dismissKey) !== '1';
      }

      this.historyEntries = applications.map((app): RequestHistory => {
          const status: RequestHistory['status'] =
            app.status.includes('rejected')
              ? 'Rejected'
              : app.status.includes('approved') || app.status === 'license_issued'
                ? 'Approved'
                : 'Pending';
          const licenseType = app.licenseType === 'extension' ? 'Extension License' : 'New License';
          return { id: app.referenceNumber, submittedOn: app.submittedDate, status, licenseType };
        });
    }
  }

  dismissLicenseApprovedBanner(): void {
    if (this.licenseIssuedApplication) {
      const dismissKey = `${this.licenseBannerDismissKeyPrefix}:${this.licenseIssuedApplication.referenceNumber}`;
      localStorage.setItem(dismissKey, '1');
    }
    this.showLicenseApprovedBanner = false;
  }

  private fileToAttachment(file: File): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const url = String(reader.result || '');
        const mime = (file.type || '').toLowerCase();
        const ext = (file.name.split('.').pop() || '').toLowerCase();

        let type: Attachment['type'] = 'jpg';
        if (mime.includes('pdf') || ext === 'pdf') type = 'pdf';
        else if (mime.includes('png') || ext === 'png') type = 'png';
        else if (mime.includes('jpg') || mime.includes('jpeg') || ext === 'jpg' || ext === 'jpeg') type = 'jpg';

        resolve({ name: file.name, type, url });
      };
      reader.readAsDataURL(file);
    });
  }

  get initials(): string {
    if (!this.user) {
      return '';
    }

    return this.user.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  toggleSection(section: SectionKey): void {
    this.collapsedSections[section] = !this.collapsedSections[section];
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  handleFileChange(controlKey: string, event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0] ?? null;

    // Reset existing preview (avoid leaking object URLs)
    const existingPreview = this.attachmentPreviewUrls[controlKey];
    if (existingPreview) {
      try {
        URL.revokeObjectURL(existingPreview);
      } catch {
        // ignore
      }
    }
    this.attachmentPreviewUrls[controlKey] = '';
    this.attachmentPreviewKinds[controlKey] = '';

    if (file) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const allowedExt = ['pdf', 'png', 'jpg', 'jpeg'];

      const isSignature = controlKey === this.signatureControl.key;
      const signatureAllowedTypes = ['image/png', 'image/jpeg'];
      const signatureAllowedExt = ['png', 'jpg', 'jpeg'];

      const ok = isSignature
        ? (signatureAllowedTypes.includes(file.type) || signatureAllowedExt.includes(ext))
        : (allowedTypes.includes(file.type) || allowedExt.includes(ext));

      if (!ok) {
        this.applicantForm.get(['attachments', controlKey])?.setValue(null);
        this.attachmentNames[controlKey] = '';
        fileInput.value = '';
        return;
      }
    }

    this.applicantForm.get(['attachments', controlKey])?.setValue(file);
    this.attachmentNames[controlKey] = file ? file.name : '';

    if (file) {
      const mime = (file.type || '').toLowerCase();
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isPdf = mime.includes('pdf') || ext === 'pdf';
      const isImage = mime.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(ext);

      if (isPdf) {
        this.attachmentPreviewKinds[controlKey] = 'pdf';
      } else if (isImage) {
        this.attachmentPreviewKinds[controlKey] = 'image';
        this.attachmentPreviewUrls[controlKey] = URL.createObjectURL(file);
      }
    }

    fileInput.value = '';
  }

  clearAttachment(controlKey: string): void {
    const existingPreview = this.attachmentPreviewUrls[controlKey];
    if (existingPreview) {
      try {
        URL.revokeObjectURL(existingPreview);
      } catch {
        // ignore
      }
    }

    this.attachmentPreviewUrls[controlKey] = '';
    this.attachmentPreviewKinds[controlKey] = '';
    this.attachmentNames[controlKey] = '';
    this.applicantForm.get(['attachments', controlKey])?.setValue(null);
  }

  onClear(): void {
    this.applicantForm.reset();
    this.resetAttachments();
    this.prefillFormValues();
    this.formStatus = 'idle';
  }

  async onSubmit(): Promise<void> {
    if (this.applicantForm.invalid) {
      this.applicantForm.markAllAsTouched();
      this.applicantForm.get('equipment')?.markAsTouched();
      this.applicantForm.get('attachments')?.markAsTouched();
      return;
    }

    this.formStatus = 'saving';

    const submission = this.applicantForm.getRawValue();
    const selectedDepartment = submission.personalInfo.department;
    const referenceNumber = `AL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const selectedCategories = this.getSelectedCategories(submission.equipment);
    const submittedDate = new Date().toISOString();

    const attachmentFiles = (submission.attachments || {}) as Record<string, File | null>;
    const attachmentEntries = Object.entries(attachmentFiles).filter(([, file]) => file instanceof File) as Array<[
      string,
      File
    ]>;
    const resolved = await Promise.all(
      attachmentEntries.map(async ([key, file]) => {
        const attachment = await this.fileToAttachment(file);
        return [key, attachment] as const;
      })
    );
    const attachments = Object.fromEntries(resolved) as Application['attachments'];

    if (this.user) {
      const appPayload: Omit<Application, 'id'> = {
        referenceNumber,
        submittedDate,
        status: 'pending_sectional',
        applicantName: submission.personalInfo.name,
        staffNumber: submission.personalInfo.staffNumber,
        department: selectedDepartment,
        designation: submission.personalInfo.designation,
        contactNumber: submission.personalInfo.contactNo,
        nic: submission.personalInfo.nic,
        licenseType: submission.basicInfo.licenseType,
        currentAdpNo: submission.basicInfo.currentAdpNo || undefined,
        dateOfFirstIssue: submission.basicInfo.dateOfFirstIssue || undefined,
        aaslAccessNo: submission.basicInfo.hasAaslPermit ? submission.basicInfo.aaslAccessNo : '',
        aaslAccessExpiry: submission.basicInfo.hasAaslPermit ? submission.basicInfo.aaslAccessExpiry : '',
        stateLicenseNo: submission.licenseInfo.stateLicenseNo,
        stateLicenseIssueDate: submission.licenseInfo.issueDate,
        stateLicenseExpiryDate: submission.licenseInfo.expiryDate,
        selectedCategories,
        safetyOrientationDate: submission.basicInfo.safetyOrientationDate,
        attachments,
        sectionalManagerId: submission.basicInfo.sectionalManagerId
      };

      this.applicationsService.createApplication(appPayload);
    }

    const newEntry: RequestHistory = {
      id: referenceNumber,
      submittedOn: submittedDate,
      status: 'Pending',
      licenseType: submission.basicInfo.licenseType === 'extension' ? 'Extension License' : 'New License'
    };

    this.historyEntries = [newEntry, ...this.historyEntries];
    this.showHistory = true;
    this.formStatus = 'submitted';
  }

  private getSelectedCategories(equipmentGroup: Record<string, boolean>): string[] {
    if (!equipmentGroup) return [];
    return Object.entries(equipmentGroup)
      .filter(([, selected]) => !!selected)
      .map(([key]) => key);
  }

  private buildEquipmentGroup(): FormGroup {
    const controls: Record<string, any> = {};
    this.equipmentOptions.forEach((option) => {
      controls[option.key] = this.fb.control(false);
    });
    return this.fb.group(controls, { validators: [this.atLeastOneTrue()] });
  }

  private buildAttachmentsGroup(): FormGroup {
    const controls: Record<string, any> = {};
    this.attachmentGroups.forEach((group) => {
      group.controls.forEach((control) => {
        const isRequired =
          control.key === 'staffIdFront' ||
          control.key === 'staffIdBack' ||
          control.key === 'stateLicenseFront' ||
          control.key === 'stateLicenseBack' ||
          control.key === 'nicFront' ||
          control.key === 'nicBack';
        controls[control.key] = isRequired
          ? this.fb.control<File | null>(null, Validators.required)
          : this.fb.control<File | null>(null);
        this.attachmentNames[control.key] = '';
        this.attachmentPreviewUrls[control.key] = '';
        this.attachmentPreviewKinds[control.key] = '';
      });
    });

    controls[this.signatureControl.key] = this.fb.control<File | null>(null);
    this.attachmentNames[this.signatureControl.key] = '';
    this.attachmentPreviewUrls[this.signatureControl.key] = '';
    this.attachmentPreviewKinds[this.signatureControl.key] = '';

    return this.fb.group(controls);
  }

  private resetAttachments(): void {
    // Cleanup preview object URLs
    Object.values(this.attachmentPreviewUrls).forEach((url) => {
      if (!url) return;
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });

    Object.keys(this.attachmentNames).forEach((key) => {
      this.attachmentNames[key] = '';
      this.attachmentPreviewUrls[key] = '';
      this.attachmentPreviewKinds[key] = '';
      this.applicantForm.get(['attachments', key])?.setValue(null);
    });
  }

  private prefillFormValues(): void {
    if (!this.user) {
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const normalizedContact = String(this.user.contactNumber || '').replace(/\D/g, '');

    this.applicantForm.patchValue({
      basicInfo: {
        licenseType: 'extension',
        sectionalManagerId: 'STF002',
        currentAdpNo: '',
        dateOfFirstIssue: '',
        safetyOrientationDate: '',
        hasAaslPermit: false,
        aaslAccessNo: '',
        aaslAccessExpiry: ''
      },
      personalInfo: {
        name: this.user.name,
        staffNumber: this.user.staffNumber,
        designation: this.user.designation || '',
        department: this.user.department,
        contactNo: normalizedContact,
        nic: this.user.nic || '',
        currentDate: currentDate
      },
      licenseInfo: {
        stateLicenseNo: '',
        issueDate: '',
        expiryDate: ''
      }
    });
  }

  private setupConditionalValidation(): void {
    const licenseTypeCtrl = this.applicantForm.get('basicInfo.licenseType');
    const currentAdpCtrl = this.applicantForm.get('basicInfo.currentAdpNo');
    const firstIssueCtrl = this.applicantForm.get('basicInfo.dateOfFirstIssue');

    const hasPermitCtrl = this.applicantForm.get('basicInfo.hasAaslPermit');
    const aaslNoCtrl = this.applicantForm.get('basicInfo.aaslAccessNo');
    const aaslExpiryCtrl = this.applicantForm.get('basicInfo.aaslAccessExpiry');

    const aviationPassFrontCtrl = this.applicantForm.get(['attachments', 'aviationPassFront']);
    const aviationPassBackCtrl = this.applicantForm.get(['attachments', 'aviationPassBack']);

    const applyLicenseTypeRules = (type: unknown) => {
      const isExtension = type === 'extension';
      if (isExtension) {
        currentAdpCtrl?.setValidators([Validators.required]);
        firstIssueCtrl?.setValidators([Validators.required, this.dateNotAfter(this.todayIso)]);
        currentAdpCtrl?.enable({ emitEvent: false });
        firstIssueCtrl?.enable({ emitEvent: false });
      } else {
        currentAdpCtrl?.clearValidators();
        firstIssueCtrl?.clearValidators();
        currentAdpCtrl?.setValue('');
        firstIssueCtrl?.setValue('');

        // not applicable for new applicants
        currentAdpCtrl?.disable({ emitEvent: false });
        firstIssueCtrl?.disable({ emitEvent: false });
      }
      currentAdpCtrl?.updateValueAndValidity();
      firstIssueCtrl?.updateValueAndValidity();
    };

    const applyPermitRules = (hasPermit: unknown) => {
      const permit = !!hasPermit;
      if (permit) {
        aaslNoCtrl?.setValidators([Validators.required]);
        aaslExpiryCtrl?.setValidators([Validators.required, this.dateAfter(this.todayIso)]);
        aaslNoCtrl?.enable({ emitEvent: false });
        aaslExpiryCtrl?.enable({ emitEvent: false });
      } else {
        aaslNoCtrl?.clearValidators();
        aaslExpiryCtrl?.clearValidators();
        aaslNoCtrl?.setValue('');
        aaslExpiryCtrl?.setValue('');

        aaslNoCtrl?.disable({ emitEvent: false });
        aaslExpiryCtrl?.disable({ emitEvent: false });

        this.clearAttachment('aviationPassFront');
        this.clearAttachment('aviationPassBack');
      }

      aaslNoCtrl?.updateValueAndValidity();
      aaslExpiryCtrl?.updateValueAndValidity();
    };

    const applyAviationPassRules = () => {
      // Only drop aviation pass uploads when the user does not have a permit.
      // Permit validity/expiry is validated separately.
      if (!hasPermitCtrl?.value) {
        this.clearAttachment('aviationPassFront');
        this.clearAttachment('aviationPassBack');
      }
    };

    licenseTypeCtrl?.valueChanges.subscribe((type) => applyLicenseTypeRules(type));
    hasPermitCtrl?.valueChanges.subscribe((hasPermit) => {
      applyPermitRules(hasPermit);
      applyAviationPassRules();
    });
    aaslExpiryCtrl?.valueChanges.subscribe(() => applyAviationPassRules());

    // Apply rules immediately on first render
    applyLicenseTypeRules(licenseTypeCtrl?.value);
    applyPermitRules(hasPermitCtrl?.value);
    applyAviationPassRules();
  }

  private atLeastOneTrue(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Record<string, unknown> | null;
      if (!value) return { required: true };
      const anySelected = Object.values(value).some((v) => v === true);
      return anySelected ? null : { required: true };
    };
  }

  private requiredNonNull(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return control.value === null || control.value === undefined ? { required: true } : null;
    };
  }

  private dateNotAfter(maxIsoDate: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = String(control.value || '').trim();
      if (!raw) return null;
      const selected = new Date(raw);
      const max = new Date(maxIsoDate);
      if (Number.isNaN(selected.getTime())) return { invalidDate: true };
      return selected.getTime() <= max.getTime() ? null : { dateTooLate: true };
    };
  }

  private dateAfter(minIsoDateExclusive: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = String(control.value || '').trim();
      if (!raw) return null;
      const selected = new Date(raw);
      const min = new Date(minIsoDateExclusive);
      if (Number.isNaN(selected.getTime())) return { invalidDate: true };
      return selected.getTime() > min.getTime() ? null : { dateTooEarly: true };
    };
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private addDays(d: Date, days: number): Date {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
