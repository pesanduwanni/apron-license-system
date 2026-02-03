import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  | 'license_issued';

export interface Attachment {
  name: string;
  type: 'pdf' | 'png' | 'jpg';
  url: string;
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
  sectionalApprovalDate?: string;
  sectionalRemarks?: string;

  // Safety Manager fields
  safetyManagerId?: string;
  safetyManagerName?: string;
  safetyApprovalDate?: string;
  safetyRemarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationsService {
  private readonly storageKey = 'applications';

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

  private mockApplications: Application[] = [
    // A mix of pending, approved and rejected applications for STF002
    {
      id: '1',
      referenceNumber: 'AL-2026-0001',
      submittedDate: '2026-01-25',
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
        staffIdFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        staffIdBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        signature: { name: 'mock-signature.png', type: 'png', url: '/assets/mock-images/mock-signature.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '2',
      referenceNumber: 'AL-2026-0002',
      submittedDate: '2026-01-24',
      status: 'pending_sectional',
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
      attachments: {
        staffIdFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        staffIdBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        aviationPassFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        aviationPassBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '3',
      referenceNumber: 'AL-2026-0003',
      submittedDate: '2026-01-23',
      status: 'pending_sectional',
      applicantName: 'Kasun Fernando',
      staffNumber: '423789',
      department: 'Cargo Services',
      designation: 'Cargo Handler',
      contactNumber: '076 987 6543',
      nic: '912345678V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-11223',
      aaslAccessExpiry: '2027-12-31',
      stateLicenseNo: 'B5544332',
      stateLicenseIssueDate: '2022-01-15',
      stateLicenseExpiryDate: '2030-01-15',
      selectedCategories: ['forkliftPalletMover', 'jcpMdLoader', 'skyLoader'],
      attachments: {
        staffIdFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        staffIdBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '4',
      referenceNumber: 'AL-2026-0004',
      submittedDate: '2026-01-22',
      status: 'approved_sectional',
      applicantName: 'Chamari Silva',
      staffNumber: '423100',
      department: 'Engineering',
      designation: 'Maintenance Technician',
      contactNumber: '071 222 3333',
      nic: '885566778V',
      licenseType: 'extension',
      currentAdpNo: 'ADP-2023-5678',
      dateOfFirstIssue: '2023-06-01',
      aaslAccessNo: 'AASL-99887',
      aaslAccessExpiry: '2027-06-01',
      stateLicenseNo: 'B1122334',
      stateLicenseIssueDate: '2019-09-20',
      stateLicenseExpiryDate: '2027-09-20',
      selectedCategories: ['maintPlatLiftTruck', 'snorkelLift', 'donkeyLift'],
      approvedCategories: ['maintPlatLiftTruck', 'snorkelLift', 'donkeyLift', 'hiLiftCatering'],
      attachments: {
        staffIdFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        staffIdBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' }
      },
      sectionalManagerId: 'STF002',
      sectionalManagerName: 'Kamala Silva',
      sectionalApprovalDate: '2026-01-19',
      sectionalRemarks: 'Added Hi-lift catering category as per department requirements.'
    },
    // Additional mock applications to exercise pagination (more than one page)
    {
      id: '5',
      referenceNumber: 'AL-2026-0005',
      submittedDate: '2026-01-21',
      status: 'pending_sectional',
      applicantName: 'Amal Perera',
      staffNumber: '20018',
      department: 'Procurement',
      designation: 'Procurement Officer',
      contactNumber: '071 111 2222',
      nic: '901112223V',
      licenseType: 'extension',
      currentAdpNo: 'ADP-2022-4567',
      dateOfFirstIssue: '2022-04-12',
      aaslAccessNo: 'AASL-11111',
      aaslAccessExpiry: '2027-04-12',
      stateLicenseNo: 'B1111222',
      stateLicenseIssueDate: '2019-01-10',
      stateLicenseExpiryDate: '2027-01-10',
      selectedCategories: ['tractor', 'buggy'],
      attachments: {
        staffIdFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        staffIdBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        stateLicenseBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicFront: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' },
        nicBack: { name: 'mock-id.jpeg', type: 'jpg', url: '/assets/mock-images/mock-id.jpeg' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '6',
      referenceNumber: 'AL-2026-0006',
      submittedDate: '2026-01-20',
      status: 'pending_sectional',
      applicantName: 'Rashmi Jayasinghe',
      staffNumber: '20019',
      department: 'Finance',
      designation: 'Accountant',
      contactNumber: '077 333 4444',
      nic: '891234567V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-22222',
      aaslAccessExpiry: '2027-05-01',
      stateLicenseNo: 'B3333444',
      stateLicenseIssueDate: '2021-03-05',
      stateLicenseExpiryDate: '2029-03-05',
      selectedCategories: ['car', 'van'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '7',
      referenceNumber: 'AL-2026-0007',
      submittedDate: '2026-01-19',
      status: 'pending_sectional',
      applicantName: 'Tharindu Weerasinghe',
      staffNumber: '20020',
      department: 'Ground Operations',
      designation: 'Coordinator',
      contactNumber: '075 555 6666',
      nic: '891112223V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-33333',
      aaslAccessExpiry: '2027-07-15',
      stateLicenseNo: 'B5555666',
      stateLicenseIssueDate: '2020-07-02',
      stateLicenseExpiryDate: '2028-07-02',
      selectedCategories: ['paxCoach', 'lorryAcBus'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '8',
      referenceNumber: 'AL-2026-0008',
      submittedDate: '2026-01-18',
      status: 'pending_sectional',
      applicantName: 'Imesha Gunawardena',
      staffNumber: '20021',
      department: 'Human Resources',
      designation: 'HR Executive',
      contactNumber: '078 777 8888',
      nic: '901223344V',
      licenseType: 'extension',
      currentAdpNo: 'ADP-2022-7890',
      dateOfFirstIssue: '2022-08-20',
      aaslAccessNo: 'AASL-44444',
      aaslAccessExpiry: '2027-08-20',
      stateLicenseNo: 'B7777888',
      stateLicenseIssueDate: '2018-11-25',
      stateLicenseExpiryDate: '2026-11-25',
      selectedCategories: ['car'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '9',
      referenceNumber: 'AL-2026-0009',
      submittedDate: '2026-01-17',
      status: 'approved_sectional',
      applicantName: 'Sajith Ranasinghe',
      staffNumber: '20022',
      department: 'Security',
      designation: 'Security Officer',
      contactNumber: '071 999 0000',
      nic: '881112223V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-55555',
      aaslAccessExpiry: '2027-09-01',
      stateLicenseNo: 'B9999000',
      stateLicenseIssueDate: '2017-09-15',
      stateLicenseExpiryDate: '2025-09-15',
      selectedCategories: ['pickUp', 'van'],
      approvedCategories: ['pickUp', 'van'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002',
      sectionalManagerName: 'Kamala Silva',
      sectionalApprovalDate: '2026-01-18'
    },
    {
      id: '10',
      referenceNumber: 'AL-2026-0010',
      submittedDate: '2026-01-16',
      status: 'pending_sectional',
      applicantName: 'Dilani Fernando',
      staffNumber: '20023',
      department: 'Catering',
      designation: 'Supervisor',
      contactNumber: '070 222 3333',
      nic: '901234568V',
      licenseType: 'extension',
      currentAdpNo: 'ADP-2021-4321',
      dateOfFirstIssue: '2021-02-18',
      aaslAccessNo: 'AASL-66666',
      aaslAccessExpiry: '2027-02-18',
      stateLicenseNo: 'B2222333',
      stateLicenseIssueDate: '2016-02-18',
      stateLicenseExpiryDate: '2024-02-18',
      selectedCategories: ['hiLiftCatering', 'paxCoach'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '11',
      referenceNumber: 'AL-2026-0011',
      submittedDate: '2026-01-15',
      status: 'pending_sectional',
      applicantName: 'Harsha Abeywickrama',
      staffNumber: '20024',
      department: 'Cargo Services',
      designation: 'Cargo Supervisor',
      contactNumber: '071 444 5555',
      nic: '891122334V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-77777',
      aaslAccessExpiry: '2027-10-10',
      stateLicenseNo: 'B4444555',
      stateLicenseIssueDate: '2020-10-10',
      stateLicenseExpiryDate: '2028-10-10',
      selectedCategories: ['skyLoader', 'forkliftPalletMover'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002'
    },
    {
      id: '12',
      referenceNumber: 'AL-2026-0012',
      submittedDate: '2026-01-14',
      status: 'rejected_sectional',
      applicantName: 'Iresha Karunaratne',
      staffNumber: '20025',
      department: 'Administration',
      designation: 'Admin Officer',
      contactNumber: '072 666 7777',
      nic: '881234567V',
      licenseType: 'new',
      aaslAccessNo: 'AASL-88888',
      aaslAccessExpiry: '2027-11-30',
      stateLicenseNo: 'B6666777',
      stateLicenseIssueDate: '2018-03-03',
      stateLicenseExpiryDate: '2026-03-03',
      selectedCategories: ['car'],
      attachments: {
        staffIdFront: { name: 'staff_id_front.png', type: 'png', url: '/assets/mock/staff_id.png' },
        staffIdBack: { name: 'staff_id_back.png', type: 'png', url: '/assets/mock/staff_id.png' },
        stateLicenseFront: { name: 'license_front.png', type: 'png', url: '/assets/mock/license.png' },
        stateLicenseBack: { name: 'license_back.png', type: 'png', url: '/assets/mock/license.png' },
        nicFront: { name: 'nic_front.png', type: 'png', url: '/assets/mock/nic.png' },
        nicBack: { name: 'nic_back.png', type: 'png', url: '/assets/mock/nic.png' }
      },
      sectionalManagerId: 'STF002',
      sectionalManagerName: 'Kamala Silva',
      sectionalApprovalDate: '2026-01-15',
      sectionalRemarks: 'Incomplete documentation provided.'
    }
  ];

  private applicationsSubject = new BehaviorSubject<Application[]>(this.loadApplications());
  public applications$: Observable<Application[]> = this.applicationsSubject.asObservable();

  constructor() {}

  private loadApplications(): Application[] {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored) as Application[];
    }
    // Initialize with mock data
    localStorage.setItem(this.storageKey, JSON.stringify(this.mockApplications));
    return this.mockApplications;
  }

  private saveApplications(apps: Application[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(apps));
    this.applicationsSubject.next(apps);
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

  // Get pending applications for sectional manager
  getPendingForSectionalManager(managerId: string): Application[] {
    return this.applicationsSubject.value.filter(
      app => app.sectionalManagerId === managerId && app.status === 'pending_sectional'
    );
  }

  // Update categories (sectional manager)
  updateCategories(appId: string, categories: string[], remarks: string): boolean {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx === -1) return false;

    apps[idx].approvedCategories = categories;
    apps[idx].sectionalRemarks = remarks;
    this.saveApplications(apps);
    return true;
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
    apps[idx].sectionalApprovalDate = new Date().toISOString().split('T')[0];
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
    apps[idx].sectionalApprovalDate = new Date().toISOString().split('T')[0];
    apps[idx].sectionalRemarks = remarks;
    this.saveApplications(apps);
    return true;
  }

  // Reset to mock data (for testing)
  resetToMockData(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.mockApplications));
    this.applicationsSubject.next([...this.mockApplications]);
  }
}
