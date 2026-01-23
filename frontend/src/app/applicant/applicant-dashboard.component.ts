import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

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

  readonly equipmentOptions = [
    { key: 'tractor', label: 'Tractor' },
    { key: 'transporter', label: 'Transporter' },
    { key: 'aciuAsuGpu', label: 'ACIU ASU / GPU' },
    { key: 'passCoach', label: 'Pass-coach' },
    { key: 'forklift', label: 'Fork-lift/Pallet Mover' },
    { key: 'buggy', label: 'Buggy' },
    { key: 'pickup', label: 'Pick-up' },
    { key: 'lorry', label: 'Lorry/ A/C Bus' },
    { key: 'toiletWaterCart', label: 'Toilet/ Water cart' },
    { key: 'paxStop', label: 'Pax stop' },
    { key: 'ambulift', label: 'Ambulift' },
    { key: 'van', label: 'Van' },
    { key: 'donkeyLift', label: 'Donkey-lift' },
    { key: 'towTug', label: 'A/C Tow-Tug' },
    { key: 'jcbLoader', label: 'JCB/Manitou Loader' },
    { key: 'hiLift', label: 'Hi-lift (Catering)' },
    { key: 'car', label: 'Car' },
    { key: 'snorkelLift', label: 'Snorkel-lift' },
    { key: 'maintTruck', label: 'Maint-Rat-UE-Truck' },
    { key: 'skyLoader', label: 'Sky loader' },
    { key: 'ev', label: 'EV' }
  ];

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
    },
    {
      title: 'Signature',
      controls: [
        { key: 'signature', label: 'Upload Signature', accept: '.png,.jpg,.jpeg' }
      ]
    }
  ];

  attachmentNames: Record<string, string> = {};
  historyEntries: RequestHistory[] = [
    {
      id: 'AL-2025-0001',
      submittedOn: '2025-01-05',
      status: 'Approved',
      licenseType: 'Extension License'
    },
    {
      id: 'AL-2024-0321',
      submittedOn: '2024-07-18',
      status: 'Rejected',
      licenseType: 'New License'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
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
        nameAndStaffNo: [''],
        designation: [''],
        department: [''],
        contactNo: [''],
        nic: ['']
      }),
      licenseInfo: this.fb.group({
        civilLicenseNo: [''],
        category: [''],
        issueDate: [''],
        expiryDate: ['']
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

  onSubmit(): void {
    if (this.applicantForm.invalid) {
      this.applicantForm.markAllAsTouched();
      return;
    }

    this.formStatus = 'saving';

    setTimeout(() => {
      const submission = this.applicantForm.getRawValue();
      const newEntry: RequestHistory = {
        id: `AL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        submittedOn: new Date().toISOString(),
        status: 'Pending',
        licenseType:
          submission.basicInfo.licenseType === 'extension'
            ? 'Extension License'
            : 'New License'
      };

      this.historyEntries = [newEntry, ...this.historyEntries];
      this.showHistory = true;
      this.formStatus = 'submitted';
    }, 500);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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
        controls[control.key] = this.fb.control<File | null>(null);
        this.attachmentNames[control.key] = '';
      });
    });
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
        nameAndStaffNo: '',
        designation: '',
        department: '',
        contactNo: '',
        nic: ''
      },
      licenseInfo: {
        civilLicenseNo: '',
        category: '',
        issueDate: '',
        expiryDate: ''
      }
    });
  }
}
