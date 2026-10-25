export type StudentStatus =
  | 'draft'
  | 'submitted'
  | 'not_applied'
  | 'application_draft'
  | 'application_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'correction_required'

export interface DocumentAttachment {
  name: string
  url: string
  verified: boolean
}

export interface StudentProfile {
  id: string
  name: string
  rollNo: string
  email: string
  branch: string
  year: number
  cgpa: number
  phone: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
  }
  status: StudentStatus
  groupId?: string
  adminRemarks?: string
  documents?: DocumentAttachment[]
}

export type Student = StudentProfile

export interface PersonalDetails {
  fullName: string
  rollNumber: string
  branch: string
  year: string
  phone: string
  email: string
  parentName: string
  parentPhone: string
}

export interface AddressDetails {
  permanentAddress: string
  city: string
  state: string
  pincode: string
}

export interface AcademicDetails {
  selfReportedCgpa: string
  previousSemPercentage: string
  activeBacklogs: string
}

export interface DocumentMeta {
  name: string
  mimeType: string
  sizeBytes: number
}

export interface Application {
  id: string
  studentId: string
  personal: {
    fullName: string
    rollNumber: string
    branch: string
    year: string
    phone: string
    email: string
    parentName: string
    parentPhone: string
  }
  address: {
    permanentAddress: string
    city: string
    state: string
    pincode: string
  }
  academic: {
    selfReportedCgpa: string
    previousSemPercentage: string
    activeBacklogs: string
  }
  documents: {
    aadharCard: DocumentMeta | null
    marksheet: DocumentMeta | null
    feeReceipt: DocumentMeta | null
    studentIdCard: DocumentMeta | null
    hostelIdCard: DocumentMeta | null
    otherDocs: { label: string; file: DocumentMeta | null }[]
  }
  status: StudentStatus
  submittedAt: string | null
  adminRemarks: string
  correctionNotes: string
  verifiedCgpa: number | null
  verifiedBy: string | null
  verifiedAt: string | null
}

export interface GroupMember {
  studentId: string
  name: string
  rollNo: string
  rollNumber: string
  branch: string
  year: number
  cgpa: number
  verifiedCgpa: number
  isLeader: boolean
  isHead: boolean
  joinedAt?: string
}

export interface StudentGroup {
  id: string
  leaderId: string
  headStudentId: string
  inviteCode: string
  maxSize: number
  status: 'open' | 'complete' | 'locked'
  members: GroupMember[]
  averageCgpa: number
  isLocked: boolean
  preferences: string[]
  allottedRoomId?: string
  allocationStatus: 'pending' | 'allotted' | 'unallotted'
}

export type Group = StudentGroup

export interface Room {
  id: string
  roomNumber: string
  block: 'A' | 'B'
  floor: number
  capacity: number
  status: 'available' | 'occupied' | 'reserved'
  allottedGroupId?: string
}

export interface AuthSession {
  userId: string
  role: 'student' | 'admin'
}

export interface UpdateApplicationOptions {
  adminRemarks?: string
  correctionNotes?: string
  verifiedCgpa?: number
  verifiedBy?: string
}
