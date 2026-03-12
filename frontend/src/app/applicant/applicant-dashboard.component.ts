import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  get isAaslValid(): boolean {
    const aaslExpiry = this.applicantForm.get('basicInfo.aaslAccessExpiry')?.value;
    if (!aaslExpiry) return false;
    const expiryDate = new Date(aaslExpiry);
    const now = new Date();
    return expiryDate > now;
  }

  readonly departmentOptions = [
    'Information Technology',
    'Operations Management',
    'Safety Department',
    'Training Department',
    'Medical Unit',
    'Human Resources',
    'Finance',
    'Engineering'
  ];

  readonly licenseCategories = [
    'Tractor',
    'Pick-up',
    'Van',
    'Car',
    'Transporter',
    'Lorry/ AIC Bus',
    'Donkey – lift',
    'Snorkel – lift',
    'ACU/ASU/GPU',
    'Toilet/Water cart',
    'A/C Tow-tug',
    'Maint-Plat-Lift-Truck',
    'Pax Coach',
    'Pax Step',
    'JCP/MD/Loader',
    'Sky Loader',
    'Fork-lift/Pallet Mover',
    'Ambu lift',
    'Hi-lift(catering)',
    'ETV',
    'Buggy'
  ];

  readonly equipmentOptions = this.licenseCategories.map((category: string) => ({
    key: category.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    label: category
  }));

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
        currentAdpNo: [''],
        dateOfFirstIssue: [''],
        safetyOrientationDate: [''],
        aaslAccessNo: [''],
        aaslAccessExpiry: ['']
      }),
      personalInfo: this.fb.group({
        name: [{value: '', disabled: true}, Validators.required],
        staffNumber: [{value: '', disabled: true}, Validators.required],
        designation: [{value: '', disabled: true}, Validators.required],
        department: ['', Validators.required],
        contactNo: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        nic: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{12}$/)]],
        currentDate: [{value: '', disabled: true}, Validators.required]
      }),
      licenseInfo: this.fb.group({
        stateLicenseNo: ['', Validators.required],
        issueDate: ['', Validators.required],
        expiryDate: ['', Validators.required]
      }),
      equipment: this.buildEquipmentGroup(),
      attachments: this.buildAttachmentsGroup()
    });
  }

  ngOnInit(): void {
    this.user = this.authService.currentUser;

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.prefillFormValues();

    if (this.user) {
      this.historyEntries = this.applicationsService
        .getApplicationsForApplicant(this.user.staffNumber)
        .map((app): RequestHistory => {
          const status: RequestHistory['status'] =
            app.status.includes('rejected') ? 'Rejected' : app.status.includes('approved') ? 'Approved' : 'Pending';
          const licenseType = app.licenseType === 'extension' ? 'Extension License' : 'New License';
          return { id: app.referenceNumber, submittedOn: app.submittedDate, status, licenseType };
        });
    }
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
    this.applicantForm.get(['attachments', controlKey])?.setValue(file);
    this.attachmentNames[controlKey] = file ? file.name : '';
    fileInput.value = '';
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
      return;
    }

    this.formStatus = 'saving';

    const submission = this.applicantForm.getRawValue();
    const selectedDepartment = submission.personalInfo.department;
    const referenceNumber = `AL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const selectedCategories = this.getSelectedCategories(submission.equipment);
    const submittedDate = new Date().toISOString().split('T')[0];

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
        aaslAccessNo: submission.basicInfo.aaslAccessNo,
        aaslAccessExpiry: submission.basicInfo.aaslAccessExpiry,
        stateLicenseNo: submission.licenseInfo.stateLicenseNo,
        stateLicenseIssueDate: submission.licenseInfo.issueDate,
        stateLicenseExpiryDate: submission.licenseInfo.expiryDate,
        selectedCategories,
        attachments,
        sectionalManagerId: 'STF002'
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
    return this.fb.group(controls);
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
      });
    });

    controls[this.signatureControl.key] = this.fb.control<File | null>(null);
    this.attachmentNames[this.signatureControl.key] = '';

    return this.fb.group(controls);
  }

  private resetAttachments(): void {
    Object.keys(this.attachmentNames).forEach((key) => {
      this.attachmentNames[key] = '';
      this.applicantForm.get(['attachments', key])?.setValue(null);
    });
  }

  private prefillFormValues(): void {
    if (!this.user) {
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    this.applicantForm.patchValue({
      basicInfo: {
        licenseType: 'extension',
        currentAdpNo: '',
        dateOfFirstIssue: '',
        safetyOrientationDate: '',
        aaslAccessNo: '',
        aaslAccessExpiry: ''
      },
      personalInfo: {
        name: this.user.name,
        staffNumber: this.user.staffNumber,
        designation: this.user.designation || '',
        department: this.user.department,
        contactNo: this.user.contactNumber || '',
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
}
