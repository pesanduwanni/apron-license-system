import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type StorageApplication = Application;

export type ApplicationStatus =
  | 'pending_sectional'
  | 'approved_sectional'
  | 'rejected_sectional'
  | 'pending_safety'
  | 'approved_safety'
  | 'rejected_safety'
  | 'orientation_assigned'
  | 'orientation_completed'
  | 'practical_assigned'
  | 'practical_completed'
  | 'medical_pending'
  | 'medical_completed'
  | 'doctor_approved'
  | 'doctor_rejected'
  | 'license_rejected'
  | 'license_issued';

export type MedicalTestResult = 'passed' | 'failed';

export interface Attachment {
  name: string;
  type: 'pdf' | 'png' | 'jpg';
  url: string;
}

export interface SummaryEvent {
  message: string;
  date?: string;
}

export interface SummaryGroup {
  actor: string;
  role: string;
  staffId?: string;
  events: SummaryEvent[];
}

export interface Application {
  id: string;
  referenceNumber: string;
  submittedDate: string;
  status: ApplicationStatus;

  // Applicant Info
  applicantName: string;
  staffNumber: string;
  department: string;
  designation: string;
  contactNumber: string;
  nic: string;

  // License Info
  licenseType: 'new' | 'extension';
  currentAdpNo?: string;
  dateOfFirstIssue?: string;
  aaslAccessNo: string;
  aaslAccessExpiry: string;
  stateLicenseNo: string;
  stateLicenseIssueDate: string;
  stateLicenseExpiryDate: string;

  // Categories selected by applicant
  selectedCategories: string[];

  // Categories modified by sectional manager
  approvedCategories?: string[];

  // Attachments
  attachments: {
    staffIdFront?: Attachment;
    staffIdBack?: Attachment;
    stateLicenseFront?: Attachment;
    stateLicenseBack?: Attachment;
    aviationPassFront?: Attachment;
    aviationPassBack?: Attachment;
    nicFront?: Attachment;
    nicBack?: Attachment;
    signature?: Attachment;
  };

  // Sectional Manager fields
  sectionalManagerId?: string;
  sectionalManagerName?: string;
  sectionalUpdatedDate?: string;
  sectionalApprovalDate?: string;
  sectionalRemarks?: string;

  // Safety Manager fields
  safetyManagerId?: string;
  safetyManagerName?: string;
  safetyApprovalDate?: string;
  safetyRemarks?: string;

  // Orientation assignment
  orientation?: {
    classDate?: string;
    className?: string;
    instructor?: string;
    // Backward compatibility with earlier UI/seed data
    classRoom?: string;
    trainer?: string;
    status?: 'pending' | 'assigned' | 'completed' | 'not_completed';
    remarks?: string;
  };

  // Practical assignment
  practical?: {
    date?: string;
    trainer?: string;
    status?: 'pending' | 'assigned' | 'completed' | 'not_completed';
    remarks?: string;
  };

  // Medical assignment tracking
  medical?: {
    assignedDate?: string;
    status?: 'pending' | 'completed';
  };

  // Medical test details (entered by Nurse)
  medicalTest?: {
    eyesight?: MedicalTestResult;
    colourBlindness?: MedicalTestResult;
    generalHealth?: MedicalTestResult;
    eyesightRemarks?: string;
    colourBlindnessRemarks?: string;
    generalHealthRemarks?: string;
    remarks?: string;
    nurseId?: string;
    nurseName?: string;
    submittedDate?: string;
  };

  // Doctor decision
  doctorReview?: {
    fit?: boolean;
    remarks?: string;
    doctorId?: string;
    doctorName?: string;
    reviewedDate?: string;
  };

  // Safety officer validation / issuance
  safetyOfficerReview?: {
    practicalAttachmentsValidated?: boolean;
    remarks?: string;
    officerId?: string;
    officerName?: string;
    validatedDate?: string;
    issuedDate?: string;
  };

  // Trainer review
  trainer?: {
    result?: 'pass' | 'fail';
    remarks?: string;
    reportName?: string;
    report?: Attachment;
    reportUploadedAt?: string;
    reviewedDate?: string;
    trainerId?: string;
    trainerName?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationsService {
  private readonly storageKey = 'applications';

  private readonly safetyPipelineStatuses: ApplicationStatus[] = [
    'approved_sectional',
    'pending_safety',
    'approved_safety',
    'rejected_safety',
    'orientation_assigned',
    'orientation_completed',
    'practical_assigned',
    'practical_completed',
    'medical_pending',
    'medical_completed',
    'doctor_approved',
    'doctor_rejected',
    'license_rejected',
    'license_issued'
  ];

  // All vehicle categories
  readonly vehicleCategories = [
    { key: 'tractor', label: 'Tractor' },
    { key: 'transporter', label: 'Transporter' },
    { key: 'aciuAsuGpu', label: 'ACU/ ASU/ GPU' },
    { key: 'paxCoach', label: 'Pax-coach' },
    { key: 'forkliftPalletMover', label: 'Fork-lift/Pallet Mover' },
    { key: 'buggy', label: 'Buggy' },
    { key: 'pickUp', label: 'Pick-up' },
    { key: 'lorryAcBus', label: 'Lorry/ A/C Bus' },
    { key: 'toiletWaterCart', label: 'Toilet/ Water cart' },
    { key: 'paxStep', label: 'Pax step' },
    { key: 'ambulift', label: 'Ambulift' },
    { key: 'van', label: 'Van' },
    { key: 'donkeyLift', label: 'Donkey-lift' },
    { key: 'acTowTug', label: 'A/C Tow-Tug' },
    { key: 'jcpMdLoader', label: 'JCP/MD/Loader' },
    { key: 'hiLiftCatering', label: 'Hi-lift (Catering)' },
    { key: 'car', label: 'Car' },
    { key: 'snorkelLift', label: 'Snorkel-lift' },
    { key: 'maintPlatLiftTruck', label: 'Maint-Plat-Lift-Truck' },
    { key: 'skyLoader', label: 'Sky loader' },
    { key: 'ev', label: 'EV' }
  ];
  private readonly mockApplications: Application[] = [
    // Minimal seed data (kept small so you can test with fresh submissions)
    {
      id: 'seed-1',
      referenceNumber: 'AL-2026-1001',
      submittedDate: '2026-03-01',
      status: 'pending_sectional',
      applicantName: 'Olivia Isabella',
      staffNumber: '423231',
      department: 'Information Technology',
      designation: 'Senior Software Engineer',
      contactNumber: '071 546 5645',
      nic: '923836657V',
      licenseType: 'extension',
      currentAdpNo: 'ADP-2024-1234',
      dateOfFirstIssue: '2024-03-15',
      aaslAccessNo: 'AASL-78901',
      aaslAccessExpiry: '2027-03-15',
      stateLicenseNo: 'B1234567',
      stateLicenseIssueDate: '2020-05-20',
      stateLicenseExpiryDate: '2028-05-20',
      selectedCategories: ['tractor', 'pickUp', 'van', 'car'],
      attachments: {
        staffIdFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        staffIdBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        signature: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: 'seed-2',
      referenceNumber: 'AL-2026-1002',
      submittedDate: '2026-03-02',
      status: 'approved_sectional',
      applicantName: 'Nuwan Perera',
      staffNumber: '423456',
      department: 'Ground Operations',
      designation: 'Operations Officer',
      contactNumber: '077 123 4567',
      nic: '901234567V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-45678',
      aaslAccessExpiry: '2027-06-30',
      stateLicenseNo: 'B9876543',
      stateLicenseIssueDate: '2021-08-10',
      stateLicenseExpiryDate: '2029-08-10',
      selectedCategories: ['transporter', 'paxCoach', 'buggy'],
      approvedCategories: ['transporter', 'paxCoach', 'buggy'],
      attachments: {
        staffIdFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        staffIdBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        aviationPassFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        aviationPassBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        signature: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' }
      },
      sectionalManagerId: 'STF002',
      sectionalManagerName: 'Kamala Silva',
      sectionalApprovalDate: '2026-03-02'
    },
    {
      id: 'seed-3',
      referenceNumber: 'AL-2026-1003',
      submittedDate: '2026-03-03',
      status: 'medical_pending',
      applicantName: 'Kavindu Jayasinghe',
      staffNumber: '423789',
      department: 'Ramp Operations',
      designation: 'Ramp Agent',
      contactNumber: '071 222 3344',
      nic: '940112233V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-11223',
      aaslAccessExpiry: '2027-10-15',
      stateLicenseNo: 'B5557788',
      stateLicenseIssueDate: '2022-02-14',
      stateLicenseExpiryDate: '2030-02-14',
      selectedCategories: ['tractor', 'van', 'car'],
      approvedCategories: ['tractor', 'van', 'car'],
      attachments: {
        staffIdFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        staffIdBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        stateLicenseBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        aviationPassFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        aviationPassBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicFront: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        nicBack: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' },
        signature: { name: 'login-airport.jpg', type: 'jpg', url: '/assets/images/login-airport.jpg' }
      },
      sectionalManagerId: 'STF002',
      sectionalManagerName: 'Kamala Silva',
      sectionalApprovalDate: '2026-03-03',
      safetyManagerId: 'STF003',
      safetyManagerName: 'Nimal Fernando',
      safetyApprovalDate: '2026-03-03',
      orientation: {
        classDate: '2026-03-04',
        className: 'Orientation Class A',
        instructor: 'Officer Jayasinghe',
        status: 'completed'
      },
      practical: {
        date: '2026-03-05',
        trainer: 'Sunil Jayawardena',
        status: 'completed'
      },
      medical: {
        assignedDate: '2026-03-06',
        status: 'pending'
      }
    }
  ];

  private applicationsSubject = new BehaviorSubject<Application[]>(this.loadApplications());
  public applications$: Observable<Application[]> = this.applicationsSubject.asObservable();

  constructor() {
    // Cross-tab / cross-window updates (helps demo “realtime” changes)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== this.storageKey) return;
        const next = this.readStoredApplications();
        if (next) {
          this.applicationsSubject.next(next);
        }
      });
    }
  }

  private loadApplications(): Application[] {
    const stored = this.readStoredApplications();
    // If the key exists (even if empty), respect it.
    // This allows you to clear data and test brand-new submissions.
    if (stored !== null) {
      return stored;
    }

    // Seed initial mock data when nothing is stored yet.
    // This ensures every role (sectional/safety/trainer) sees items on first login.
    const seeded = this.buildSeedApplications();
    localStorage.setItem(this.storageKey, JSON.stringify(seeded));
    return seeded;
  }

  // Intentionally no auto-injection of extra mock data into existing localStorage.
  // Use reset/clear methods to control your test data.

  private readStoredApplications(): Application[] | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StorageApplication[];
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private buildSeedApplications(): Application[] {
    // Minimal seed: 2 applications only.
    return [...this.mockApplications];
  }

  clearAllApplications(): void {
    localStorage.setItem(this.storageKey, JSON.stringify([]));
    this.applicationsSubject.next([]);
  }

  private saveApplications(apps: Application[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(apps));
    this.applicationsSubject.next(apps);
  }

  createApplication(payload: Omit<Application, 'id'> & { id?: string }): Application {
    const apps = this.getApplications();
    const id = payload.id ?? this.generateId();
    const app: Application = { ...payload, id };
    this.saveApplications([app, ...apps]);
    return app;
  }

  getApplicationsForApplicant(staffNumber: string): Application[] {
    return this.applicationsSubject.value.filter(a => a.staffNumber === staffNumber);
  }

  private generateId(): string {
    return String(Date.now()) + '-' + Math.floor(Math.random() * 1000000);
  }

  getApplications(): Application[] {
    return this.applicationsSubject.value;
  }

  getApplicationById(id: string): Application | undefined {
    return this.applicationsSubject.value.find(app => app.id === id);
  }

  getApplicationByReference(ref: string): Application | undefined {
    return this.applicationsSubject.value.find(app => app.referenceNumber === ref);
  }

  // Get applications for a specific sectional manager
  getApplicationsForSectionalManager(managerId: string): Application[] {
    return this.applicationsSubject.value.filter(
      app => app.sectionalManagerId === managerId
    );
  }

  // Get applications visible to a safety manager (anything that moved beyond sectional approval)
  getApplicationsForSafetyManager(managerId: string): Application[] {
    return this.applicationsSubject.value.filter(app => {
      const inPipeline = this.safetyPipelineStatuses.includes(app.status);
      const assignedToManager =
        app.safetyManagerId === managerId ||
        (!app.safetyManagerId && app.status === 'approved_sectional');
      return inPipeline && assignedToManager;
    });
  }

  // Get applications visible to a trainer
  getApplicationsForTrainer(trainerName: string): Application[] {
    // Trainers should only see applicants that have been assigned to them
    // for practical training (and its downstream stages).
    return this.applicationsSubject.value.filter(
      app => app.practical?.trainer === trainerName && !!app.practical?.status
    );
  }

  // Get pending applications for sectional manager
  getPendingForSectionalManager(managerId: string): Application[] {
    return this.applicationsSubject.value.filter(
      app => app.sectionalManagerId === managerId && app.status === 'pending_sectional'
    );
  }

  // Update categories (sectional manager) without changing status
  updateCategories(
    appId: string,
    managerId: string,
    managerName: string,
    categories: string[],
    remarks: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].approvedCategories = categories;
    apps[idx].sectionalRemarks = remarks;
    apps[idx].sectionalManagerId = managerId;
    apps[idx].sectionalManagerName = managerName;
    // Track category update separately from the approve/reject decision date.
    apps[idx].sectionalUpdatedDate = new Date().toISOString();
    this.saveApplications(apps);
    return true;
  }

  // Summary timeline helpers (sidebar)
  // Ordered groups as per UI mock: User -> Sectional -> Safety -> Trainer -> Medical -> Doctor -> Officer
  buildSummaryGroups(app: Application): SummaryGroup[] {
    const groups: SummaryGroup[] = [];

    const sortEvents = (events: SummaryEvent[]): SummaryEvent[] => {
      return [...events].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return aTime - bTime;
      });
    };

    const pushGroup = (group: SummaryGroup) => {
      const events = sortEvents(group.events);
      if (!events.length) return;
      groups.push({ ...group, events });
    };

    const pushEvent = (events: SummaryEvent[], message: string, date?: string) => {
      if (!date) return;
      events.push({ message, date });
    };

    // User
    pushGroup({
      actor: app.applicantName,
      staffId: app.staffNumber,
      role: 'User',
      events: [
        {
          message: 'Request sent',
          date: app.submittedDate
        }
      ]
    });

    // Sectional Manager
    {
      const events: SummaryEvent[] = [];

      const approved = app.approvedCategories || [];
      const original = app.selectedCategories || [];
      const changed =
        approved.length !== 0 &&
        (approved.length !== original.length || approved.some((k) => !original.includes(k)));

      if (changed) {
        pushEvent(events, 'Update equipment...', app.sectionalUpdatedDate || app.sectionalApprovalDate);
      }

      if (app.sectionalRemarks) {
        pushEvent(events, 'Comment added', app.sectionalUpdatedDate || app.sectionalApprovalDate);
      }

      if (app.sectionalApprovalDate) {
        const message =
          app.status === 'rejected_sectional'
            ? 'Request Rejected'
            : app.status === 'pending_sectional'
              ? 'Reviewed request'
              : 'Request Accepted';

        pushEvent(events, message, app.sectionalApprovalDate);
      }

      if ((app.sectionalManagerName || app.sectionalManagerId) && events.length) {
        pushGroup({
          actor: app.sectionalManagerName || 'Sectional Manager',
          staffId: app.sectionalManagerId,
          role: 'Sectional Manager',
          events
        });
      }
    }

    // Safety Manager
    {
      const events: SummaryEvent[] = [];

      if (app.trainer?.reportUploadedAt) {
        pushEvent(events, 'Upload reports', app.trainer.reportUploadedAt);
      }

      if (app.safetyApprovalDate) {
        const message = app.status === 'rejected_safety' ? 'Request Rejected' : 'Request Accepted';
        pushEvent(events, message, app.safetyApprovalDate);
      }

      if (app.safetyRemarks) {
        pushEvent(events, 'Comment added', app.safetyApprovalDate);
      }

      // Orientation
      if (app.orientation?.classDate && (app.orientation.status === 'assigned' || app.status === 'orientation_assigned')) {
        pushEvent(events, 'Orientation assigned', app.orientation.classDate);
      }
      if (app.orientation?.classDate && app.orientation.status === 'completed') {
        pushEvent(events, 'Orientation completed', app.orientation.classDate);
      }
      if (app.orientation?.classDate && app.orientation.status === 'not_completed') {
        pushEvent(events, 'Orientation not completed', app.orientation.classDate);
      }

      // Practical
      if (app.practical?.date && (app.practical.status === 'assigned' || app.status === 'practical_assigned')) {
        pushEvent(events, 'Practical assigned', app.practical.date);
      }
      if (app.practical?.date && app.practical.status === 'completed') {
        pushEvent(events, 'Practical completed', app.practical.date);
      }
      if (app.practical?.date && app.practical.status === 'not_completed') {
        pushEvent(events, 'Practical not completed', app.practical.date);
      }

      // Medical assignment
      if (app.medical?.assignedDate) {
        pushEvent(events, 'Sent to Medical', app.medical.assignedDate);
      }

      if ((app.safetyManagerName || app.safetyManagerId) && events.length) {
        pushGroup({
          actor: app.safetyManagerName || 'Safety Manager',
          staffId: app.safetyManagerId,
          role: 'Safety Manager',
          events
        });
      }
    }

    // Trainer
    {
      const events: SummaryEvent[] = [];
      const trainer = app.trainer;

      if (app.practical?.date) {
        pushEvent(events, 'Practical scheduled', app.practical.date);
      }

      if (trainer?.reportUploadedAt) {
        pushEvent(events, 'Upload reports', trainer.reportUploadedAt);
      }

      if (trainer?.reviewedDate) {
        const message = trainer.result === 'fail' ? 'Request Rejected' : 'Request Accepted';
        pushEvent(events, message, trainer.reviewedDate);
      }

      if ((trainer?.trainerName || trainer?.trainerId || app.practical?.trainer) && events.length) {
        pushGroup({
          actor: trainer?.trainerName || app.practical?.trainer || 'Trainer',
          staffId: trainer?.trainerId,
          role: 'Trainer',
          events
        });
      }
    }

    // Medical Nurse
    {
      const events: SummaryEvent[] = [];
      const test = app.medicalTest;

      if (test?.eyesight) {
        pushEvent(events, `Eyesight: ${test.eyesight === 'passed' ? 'Passed' : 'Failed'}`, test.submittedDate);
      }
      if (test?.colourBlindness) {
        pushEvent(
          events,
          `Colour blindness: ${test.colourBlindness === 'passed' ? 'Passed' : 'Failed'}`,
          test.submittedDate
        );
      }
      if (test?.generalHealth) {
        pushEvent(events, `General health: ${test.generalHealth === 'passed' ? 'Passed' : 'Failed'}`, test.submittedDate);
      }
      if (test?.remarks) {
        pushEvent(events, 'Comment added', test.submittedDate);
      }
      if (test?.submittedDate) {
        pushEvent(events, 'Complete tests', test.submittedDate);
      }

      if ((test?.nurseName || test?.nurseId) && events.length) {
        pushGroup({
          actor: test?.nurseName || 'Medical Nurse',
          staffId: test?.nurseId,
          role: 'Medical Nurse',
          events
        });
      }
    }

    // Doctor
    {
      const events: SummaryEvent[] = [];
      const review = app.doctorReview;

      if (review?.reviewedDate) {
        pushEvent(events, review.fit ? 'Request Accepted' : 'Request Rejected', review.reviewedDate);
      }
      if (review?.remarks) {
        pushEvent(events, 'Comment added', review.reviewedDate);
      }

      if ((review?.doctorName || review?.doctorId) && events.length) {
        pushGroup({
          actor: review?.doctorName || 'Doctor',
          staffId: review?.doctorId,
          role: 'Doctor',
          events
        });
      }
    }

    // Safety Officer (validation / issuance)
    {
      const events: SummaryEvent[] = [];
      const officer = app.safetyOfficerReview;

      if (officer?.validatedDate) {
        pushEvent(events, 'Validate attachments', officer.validatedDate);
      }
      if (officer?.issuedDate) {
        pushEvent(events, 'License issued', officer.issuedDate);
      }

      if (officer?.remarks) {
        pushEvent(events, 'Comment added', officer.issuedDate || officer.validatedDate);
      }

      if ((officer?.officerName || officer?.officerId) && events.length) {
        pushGroup({
          actor: officer?.officerName || 'Safety Officer',
          staffId: officer?.officerId,
          role: 'Safety Officer',
          events
        });
      }
    }

    return groups;
  }
  // Approve application (sectional manager)
  approveApplication(
    appId: string,
    managerId: string,
    managerName: string,
    categories: string[],
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].status = 'approved_sectional';
    apps[idx].sectionalManagerId = managerId;
    apps[idx].sectionalManagerName = managerName;
    apps[idx].sectionalApprovalDate = new Date().toISOString();
    apps[idx].approvedCategories = categories;
    if (remarks) {
      apps[idx].sectionalRemarks = remarks;
    }
    this.saveApplications(apps);
    return true;
  }

  // Reject application (sectional manager)
  rejectApplication(
    appId: string,
    managerId: string,
    managerName: string,
    remarks: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].status = 'rejected_sectional';
    apps[idx].sectionalManagerId = managerId;
    apps[idx].sectionalManagerName = managerName;
    apps[idx].sectionalApprovalDate = new Date().toISOString();
    apps[idx].sectionalRemarks = remarks;
    this.saveApplications(apps);
    return true;
  }

  // Safety manager accepts application after attachment validation
  acceptApplicationSafety(
    appId: string,
    managerId: string,
    managerName: string,
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    // Safety manager accepted the application -> mark as approved by safety
    apps[idx].status = 'approved_safety';
    apps[idx].safetyManagerId = managerId;
    apps[idx].safetyManagerName = managerName;
    apps[idx].safetyApprovalDate = new Date().toISOString();
    if (remarks) {
      apps[idx].safetyRemarks = remarks;
    }
    this.saveApplications(apps);
    return true;
  }

  // Safety manager rejects application
  rejectApplicationSafety(
    appId: string,
    managerId: string,
    managerName: string,
    remarks: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].status = 'rejected_safety';
    apps[idx].safetyManagerId = managerId;
    apps[idx].safetyManagerName = managerName;
    apps[idx].safetyApprovalDate = new Date().toISOString();
    apps[idx].safetyRemarks = remarks;
    this.saveApplications(apps);
    return true;
  }

  assignOrientation(
    appId: string,
    managerId: string,
    payload: { classDate: string; className: string; instructor: string; remarks?: string }
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].orientation = {
      classDate: payload.classDate,
      className: payload.className,
      instructor: payload.instructor,
      status: 'assigned',
      remarks: payload.remarks
    };
    apps[idx].safetyManagerId = managerId;
    apps[idx].status = 'orientation_assigned';
    this.saveApplications(apps);
    return true;
  }

  updateOrientationStatus(
    appId: string,
    status: 'completed' | 'not_completed',
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    const orientation = apps[idx].orientation || {};
    orientation.status = status;
    if (remarks) {
      orientation.remarks = remarks;
    }
    apps[idx].orientation = orientation;
    apps[idx].status = status === 'completed' ? 'orientation_completed' : 'pending_safety';
    this.saveApplications(apps);
    return true;
  }

  assignPractical(
    appId: string,
    payload: { date: string; trainer: string; remarks?: string }
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].practical = {
      date: payload.date,
      trainer: payload.trainer,
      status: 'assigned',
      remarks: payload.remarks
    };
    apps[idx].status = 'practical_assigned';
    this.saveApplications(apps);
    return true;
  }

  updatePracticalStatus(
    appId: string,
    status: 'completed' | 'not_completed',
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    const practical = apps[idx].practical || {};
    practical.status = status;
    if (remarks) {
      practical.remarks = remarks;
    }
    apps[idx].practical = practical;
    apps[idx].status = status === 'completed' ? 'practical_completed' : 'orientation_completed';
    this.saveApplications(apps);
    return true;
  }

  sendForMedical(appId: string, assignedDate: string): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].medical = {
      assignedDate,
      status: 'pending'
    };
    apps[idx].status = 'medical_pending';
    this.saveApplications(apps);
    return true;
  }

  // Nurse submits medical test details
  submitMedicalTest(
    appId: string,
    nurseId: string,
    nurseName: string,
    payload: {
      eyesight: MedicalTestResult;
      colourBlindness: MedicalTestResult;
      generalHealth: MedicalTestResult;
      eyesightRemarks?: string;
      colourBlindnessRemarks?: string;
      generalHealthRemarks?: string;
      remarks?: string;
    }
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].medicalTest = {
      eyesight: payload.eyesight,
      colourBlindness: payload.colourBlindness,
      generalHealth: payload.generalHealth,
      eyesightRemarks: payload.eyesightRemarks,
      colourBlindnessRemarks: payload.colourBlindnessRemarks,
      generalHealthRemarks: payload.generalHealthRemarks,
      remarks: payload.remarks,
      nurseId,
      nurseName,
      submittedDate: new Date().toISOString()
    };

    const medical = apps[idx].medical || {};
    medical.status = 'completed';
    apps[idx].medical = medical;
    apps[idx].status = 'medical_completed';

    this.saveApplications(apps);
    return true;
  }

  // Doctor submits fit/not-fit decision
  submitDoctorDecision(
    appId: string,
    doctorId: string,
    doctorName: string,
    fit: boolean,
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].doctorReview = {
      fit,
      remarks,
      doctorId,
      doctorName,
      reviewedDate: new Date().toISOString()
    };

    apps[idx].status = fit ? 'doctor_approved' : 'doctor_rejected';
    this.saveApplications(apps);
    return true;
  }

  // Safety officer validates attachments after practical + doctor approval
  validatePracticalAttachments(
    appId: string,
    officerId: string,
    officerName: string,
    accepted: boolean,
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].safetyOfficerReview = {
      practicalAttachmentsValidated: accepted,
      remarks,
      officerId,
      officerName,
      validatedDate: new Date().toISOString(),
      issuedDate: apps[idx].safetyOfficerReview?.issuedDate
    };

    if (!accepted) {
      apps[idx].status = 'license_rejected';
    }

    this.saveApplications(apps);
    return true;
  }

  // Safety officer issues digital license
  issueDigitalLicense(appId: string, officerId: string, officerName: string): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    const review = apps[idx].safetyOfficerReview;
    if (!review?.practicalAttachmentsValidated) return false;

    apps[idx].safetyOfficerReview = {
      ...review,
      officerId,
      officerName,
      issuedDate: new Date().toISOString()
    };
    apps[idx].status = 'license_issued';
    this.saveApplications(apps);
    return true;
  }

  // Nurse list: applicants forwarded for medical
  getApplicationsForNurse(): Application[] {
    return this.applicationsSubject.value.filter(app => app.status === 'medical_pending');
  }

  // Doctor list: applicants with completed medical test
  getApplicationsForDoctor(): Application[] {
    return this.applicationsSubject.value.filter(app => app.status === 'medical_completed');
  }

  // Safety officer list: applicants approved by doctor and not yet issued/rejected
  getApplicationsForSafetyOfficer(): Application[] {
    return this.applicationsSubject.value.filter(app => app.status === 'doctor_approved');
  }

  updateTrainerReport(appId: string, report: string | Attachment): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    const trainer = apps[idx].trainer || {};
    if (typeof report === 'string') {
      trainer.reportName = report;
    } else {
      trainer.report = report;
      trainer.reportName = report.name;
    }
    trainer.reportUploadedAt = new Date().toISOString();
    apps[idx].trainer = trainer;
    this.saveApplications(apps);
    return true;
  }

  submitTrainerDecision(
    appId: string,
    trainerId: string,
    trainerName: string,
    result: 'pass' | 'fail',
    remarks?: string
  ): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    const trainer = apps[idx].trainer || {};
    trainer.result = result;
    trainer.remarks = remarks;
    trainer.reviewedDate = new Date().toISOString();
    trainer.trainerId = trainerId;
    trainer.trainerName = trainerName;
    apps[idx].trainer = trainer;

    const practical = apps[idx].practical || {};
    practical.status = result === 'pass' ? 'completed' : 'not_completed';
    apps[idx].practical = practical;
    apps[idx].status = result === 'pass' ? 'practical_completed' : 'orientation_completed';

    this.saveApplications(apps);
    return true;
  }

  // Reset to mock data (for testing)
  resetToMockData(): void {
    const seeded = this.buildSeedApplications();
    localStorage.setItem(this.storageKey, JSON.stringify(seeded));
    this.applicationsSubject.next([...seeded]);
  }
}
