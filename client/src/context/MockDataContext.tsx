'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { INITIAL_GROUPS, INITIAL_ROOMS, INITIAL_STUDENTS } from '@/lib/mock-data'
import type {
  Application,
  AuthSession,
  DocumentAttachment,
  GroupMember,
  Room,
  StudentGroup,
  StudentProfile,
  StudentStatus,
  UpdateApplicationOptions,
} from '@/lib/types'

interface MockDataContextValue {
  session: AuthSession | null
  applications: Application[]
  students: StudentProfile[]
  rooms: Room[]
  groups: StudentGroup[]
  currentStudent: StudentProfile | null
  currentRound: number
  isHydrated: boolean
  groupsPublished: boolean
  loginAsStudent: (identifier: string, password: string) => { success: boolean; error?: string }
  loginAsAdmin: (identifier: string, password: string) => { success: boolean; error?: string }
  loginStudent: (identifier: string) => void
  logout: () => void
  updateApplicationStatus: (
    id: string,
    status: StudentStatus,
    options?: UpdateApplicationOptions | string
  ) => void
  createOrJoinGroup: (studentId: string, targetRollNo: string) => { success: boolean; message: string }
  createGroup: (studentId: string, maxSize: number) => { success: boolean; error?: string }
  joinGroup: (inviteCode: string, studentId: string) => { success: boolean; error?: string }
  leaveGroup: (studentId: string) => { success: boolean; error?: string }
  lockGroup: (groupId: string) => { success: boolean; error?: string }
  savePreferences: (groupId: string, preferences: string[]) => void
  runAllocationRound: () => void
  resetAllData: () => void
}

const MockDataContext = createContext<MockDataContextValue | null>(null)
const STORAGE_KEY = 'hostel_portal_state'
const DEFAULT_STUDENT_ID = INITIAL_STUDENTS[0]?.id ?? ''

function statusForApplication(status: StudentStatus): StudentStatus {
  if (status === 'submitted') return 'application_submitted'
  if (status === 'draft') return 'application_draft'
  return status
}

function documentMeta(name: string, verified: boolean) {
  return verified ? { name, mimeType: 'application/pdf', sizeBytes: 0 } : null
}

function createApplications(students: StudentProfile[]): Application[] {
  return students.map((student) => {
    const docs = student.documents ?? []
    return {
      id: `app_${student.id}`,
      studentId: student.id,
      personal: {
        fullName: student.name,
        rollNumber: student.rollNo,
        branch: student.branch,
        year: String(student.year),
        phone: student.phone,
        email: student.email,
        parentName: '',
        parentPhone: '',
      },
      address: {
        permanentAddress: student.address.street,
        city: student.address.city,
        state: student.address.state,
        pincode: student.address.pincode,
      },
      academic: {
        selfReportedCgpa: String(student.cgpa),
        previousSemPercentage: '',
        activeBacklogs: '0',
      },
      documents: {
        aadharCard: documentMeta(docs[0]?.name ?? 'Government ID', Boolean(docs[0])),
        marksheet: documentMeta(docs[1]?.name ?? 'Semester Marksheet', Boolean(docs[1])),
        feeReceipt: documentMeta(docs[2]?.name ?? 'Hostel Fee Clearance', Boolean(docs[2])),
        studentIdCard: documentMeta(docs[3]?.name ?? 'Student Identity Card', Boolean(docs[3])),
        hostelIdCard: null,
        otherDocs: [],
      },
      status: statusForApplication(student.status),
      submittedAt: student.status === 'submitted' ? '2025-01-15T12:00:00.000Z' : null,
      adminRemarks: student.adminRemarks ?? '',
      correctionNotes: '',
      verifiedCgpa: student.status === 'approved' ? student.cgpa : null,
      verifiedBy: student.status === 'approved' ? 'Admin' : null,
      verifiedAt: null,
    }
  })
}

function makeMember(student: StudentProfile, isHead = false): GroupMember {
  return {
    studentId: student.id,
    name: student.name,
    rollNo: student.rollNo,
    rollNumber: student.rollNo,
    branch: student.branch,
    year: student.year,
    cgpa: student.cgpa,
    verifiedCgpa: student.cgpa,
    isLeader: isHead,
    isHead,
    joinedAt: new Date().toISOString(),
  }
}

function averageCgpa(members: GroupMember[]): number {
  if (members.length === 0) return 0
  return Number((members.reduce((sum, member) => sum + member.verifiedCgpa, 0) / members.length).toFixed(2))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === 'string' && [
    'draft',
    'submitted',
    'not_applied',
    'application_draft',
    'application_submitted',
    'under_review',
    'approved',
    'rejected',
    'correction_required',
  ].includes(value)
}

function normalizeStudents(value: unknown): StudentProfile[] {
  if (!Array.isArray(value)) return INITIAL_STUDENTS
  return INITIAL_STUDENTS.map((initial) => {
    const saved = value.find((entry) => isRecord(entry) && entry.id === initial.id)
    if (!isRecord(saved)) return initial
    const savedAddress = isRecord(saved.address) ? saved.address : {}
    return {
      ...initial,
      name: typeof saved.name === 'string' ? saved.name : initial.name,
      rollNo: typeof saved.rollNo === 'string' ? saved.rollNo : initial.rollNo,
      email: typeof saved.email === 'string' ? saved.email : initial.email,
      branch: typeof saved.branch === 'string' ? saved.branch : initial.branch,
      year: typeof saved.year === 'number' ? saved.year : initial.year,
      cgpa: typeof saved.cgpa === 'number' ? saved.cgpa : initial.cgpa,
      phone: typeof saved.phone === 'string' ? saved.phone : initial.phone,
      address: {
        street: typeof savedAddress.street === 'string' ? savedAddress.street : initial.address.street,
        city: typeof savedAddress.city === 'string' ? savedAddress.city : initial.address.city,
        state: typeof savedAddress.state === 'string' ? savedAddress.state : initial.address.state,
        pincode: typeof savedAddress.pincode === 'string' ? savedAddress.pincode : initial.address.pincode,
      },
      status: isStudentStatus(saved.status) ? saved.status : initial.status,
      groupId: typeof saved.groupId === 'string' ? saved.groupId : undefined,
      adminRemarks: typeof saved.adminRemarks === 'string' ? saved.adminRemarks : undefined,
      documents: Array.isArray(saved.documents)
        ? saved.documents.filter((document): document is DocumentAttachment =>
            isRecord(document) && typeof document.name === 'string' &&
            typeof document.url === 'string' && typeof document.verified === 'boolean')
        : initial.documents,
    }
  })
}

function normalizeRooms(value: unknown): Room[] {
  if (!Array.isArray(value)) return INITIAL_ROOMS
  return INITIAL_ROOMS.map((initial) => {
    const saved = value.find((entry) => isRecord(entry) && entry.id === initial.id)
    if (!isRecord(saved)) return initial
    return {
      ...initial,
      roomNumber: typeof saved.roomNumber === 'string' ? saved.roomNumber : initial.roomNumber,
      block: saved.block === 'A' || saved.block === 'B' ? saved.block : initial.block,
      floor: typeof saved.floor === 'number' ? saved.floor : initial.floor,
      capacity: typeof saved.capacity === 'number' ? saved.capacity : initial.capacity,
      status: saved.status === 'available' || saved.status === 'occupied' || saved.status === 'reserved'
        ? saved.status
        : initial.status,
      allottedGroupId: typeof saved.allottedGroupId === 'string' ? saved.allottedGroupId : undefined,
    }
  })
}

function normalizeGroups(value: unknown, students: StudentProfile[]): StudentGroup[] {
  if (!Array.isArray(value)) return INITIAL_GROUPS
  return value.flatMap((entry): StudentGroup[] => {
    if (!isRecord(entry) || typeof entry.id !== 'string') return []
    const leaderId = typeof entry.headStudentId === 'string'
      ? entry.headStudentId
      : typeof entry.leaderId === 'string'
        ? entry.leaderId
        : ''
    const rawMembers = Array.isArray(entry.members) ? entry.members : []
    const members = rawMembers.flatMap((rawMember): GroupMember[] => {
      if (!isRecord(rawMember) || typeof rawMember.studentId !== 'string') return []
      const profile = students.find((student) => student.id === rawMember.studentId)
      if (!profile) return []
      const head = rawMember.studentId === leaderId ||
        rawMember.isHead === true ||
        rawMember.isLeader === true
      const member = makeMember(profile, head)
      return [{
        ...member,
        name: typeof rawMember.name === 'string' ? rawMember.name : member.name,
        rollNo: typeof rawMember.rollNo === 'string' ? rawMember.rollNo : member.rollNo,
        rollNumber: typeof rawMember.rollNumber === 'string'
          ? rawMember.rollNumber
          : typeof rawMember.rollNo === 'string'
            ? rawMember.rollNo
            : member.rollNumber,
        branch: typeof rawMember.branch === 'string' ? rawMember.branch : member.branch,
        year: typeof rawMember.year === 'number' ? rawMember.year : member.year,
        cgpa: typeof rawMember.cgpa === 'number' ? rawMember.cgpa : member.cgpa,
        verifiedCgpa: typeof rawMember.verifiedCgpa === 'number'
          ? rawMember.verifiedCgpa
          : typeof rawMember.cgpa === 'number'
            ? rawMember.cgpa
            : member.verifiedCgpa,
        isLeader: head,
        isHead: head,
        joinedAt: typeof rawMember.joinedAt === 'string' ? rawMember.joinedAt : undefined,
      }]
    })
    const isLocked = typeof entry.isLocked === 'boolean'
      ? entry.isLocked
      : entry.status === 'locked'
    const idSuffix = entry.id.replace(/\D/g, '').slice(-4).padStart(4, '0')
    return [{
      id: entry.id,
      leaderId: leaderId || members[0]?.studentId || '',
      headStudentId: leaderId || members[0]?.studentId || '',
      inviteCode: typeof entry.inviteCode === 'string' ? entry.inviteCode : `GRP-${idSuffix}`,
      maxSize: entry.maxSize === 3 || entry.maxSize === 4 ? entry.maxSize : 4,
      status: isLocked ? 'locked' : members.length >= 3 ? 'complete' : 'open',
      members,
      averageCgpa: typeof entry.averageCgpa === 'number' ? entry.averageCgpa : averageCgpa(members),
      isLocked,
      preferences: Array.isArray(entry.preferences)
        ? entry.preferences.filter((preference): preference is string => typeof preference === 'string')
        : [],
      allottedRoomId: typeof entry.allottedRoomId === 'string' ? entry.allottedRoomId : undefined,
      allocationStatus: entry.allocationStatus === 'allotted' || entry.allocationStatus === 'unallotted'
        ? entry.allocationStatus
        : 'pending',
    }]
  })
}

function isApplication(value: unknown): value is Application {
  if (!isRecord(value) || !isRecord(value.personal) || !isRecord(value.address) ||
    !isRecord(value.academic) || !isRecord(value.documents)) return false
  const documents = value.documents
  const validDoc = (doc: unknown) => doc === null ||
    (isRecord(doc) && typeof doc.name === 'string' &&
      typeof doc.mimeType === 'string' && typeof doc.sizeBytes === 'number')
  return typeof value.id === 'string' &&
    typeof value.studentId === 'string' &&
    isStudentStatus(value.status) &&
    typeof value.personal.fullName === 'string' &&
    typeof value.personal.rollNumber === 'string' &&
    typeof value.personal.branch === 'string' &&
    typeof value.personal.year === 'string' &&
    typeof value.personal.phone === 'string' &&
    typeof value.personal.email === 'string' &&
    typeof value.personal.parentName === 'string' &&
    typeof value.personal.parentPhone === 'string' &&
    typeof value.address.permanentAddress === 'string' &&
    typeof value.address.city === 'string' &&
    typeof value.address.state === 'string' &&
    typeof value.address.pincode === 'string' &&
    typeof value.academic.selfReportedCgpa === 'string' &&
    typeof value.academic.previousSemPercentage === 'string' &&
    typeof value.academic.activeBacklogs === 'string' &&
    validDoc(documents.aadharCard) &&
    validDoc(documents.marksheet) &&
    validDoc(documents.feeReceipt) &&
    validDoc(documents.studentIdCard) &&
    validDoc(documents.hostelIdCard) &&
    Array.isArray(documents.otherDocs) &&
    documents.otherDocs.every((doc) =>
      isRecord(doc) && typeof doc.label === 'string' && validDoc(doc.file)) &&
    typeof value.adminRemarks === 'string' &&
    typeof value.correctionNotes === 'string' &&
    (value.submittedAt === null || typeof value.submittedAt === 'string') &&
    (value.verifiedCgpa === null || typeof value.verifiedCgpa === 'number') &&
    (value.verifiedBy === null || typeof value.verifiedBy === 'string') &&
    (value.verifiedAt === null || typeof value.verifiedAt === 'string')
}

function normalizeApplications(value: unknown, students: StudentProfile[]): Application[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isApplication)) {
    return createApplications(students)
  }
  return value.filter((application) => students.some((student) => student.id === application.studentId))
}

function makeGroup(id: string, leader: StudentProfile, maxSize: number, members: GroupMember[]): StudentGroup {
  const inviteCode = `GRP-${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
  return {
    id,
    leaderId: leader.id,
    headStudentId: leader.id,
    inviteCode,
    maxSize,
    status: 'open',
    members,
    averageCgpa: averageCgpa(members),
    isLocked: false,
    preferences: [],
    allocationStatus: 'pending',
  }
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS)
  const [applications, setApplications] = useState<Application[]>(() => createApplications(INITIAL_STUDENTS))
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS)
  const [groups, setGroups] = useState<StudentGroup[]>(INITIAL_GROUPS)
  const [currentRound, setCurrentRound] = useState(1)
  const [session, setSession] = useState<AuthSession | null>(
    DEFAULT_STUDENT_ID ? { userId: DEFAULT_STUDENT_ID, role: 'student' } : null
  )
  const [groupsPublished, setGroupsPublished] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed: unknown = JSON.parse(saved)
          if (typeof parsed === 'object' && parsed !== null) {
            const state = parsed as Record<string, unknown>
            const loadedStudents = normalizeStudents(state.students)
            setStudents(loadedStudents)
            setApplications(normalizeApplications(state.applications, loadedStudents))
            setRooms(normalizeRooms(state.rooms))
            setGroups(normalizeGroups(state.groups, loadedStudents))
            setCurrentRound(typeof state.currentRound === 'number' ? state.currentRound : 1)
            if (isRecord(state.session)) {
              const savedSession = state.session
              if (typeof savedSession.userId === 'string' &&
                (savedSession.role === 'student' || savedSession.role === 'admin')) {
                setSession({ userId: savedSession.userId, role: savedSession.role })
              }
            }
            setGroupsPublished(state.groupsPublished === true)
          }
        }
      } catch (error) {
        console.error('Failed to load saved hostel portal state.', error)
      } finally {
        setHydrated(true)
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        students,
        applications,
        rooms,
        groups,
        currentRound,
        session,
        groupsPublished,
      }))
    } catch (error) {
      console.error('Failed to save hostel portal state.', error)
    }
  }, [students, applications, rooms, groups, currentRound, session, groupsPublished, hydrated])

  const currentStudent = useMemo(
    () => students.find((student) => student.id === session?.userId) ?? students[0] ?? null,
    [students, session]
  )

  const loginAsStudent = useCallback((identifier: string, password: string) => {
    const normalized = identifier.trim().toLowerCase()
    const student = students.find((candidate) =>
      candidate.email.toLowerCase() === normalized ||
      candidate.rollNo.toLowerCase() === normalized
    )
    if (!student) return { success: false, error: 'Email or roll number not found.' }
    if (password !== 'student123') return { success: false, error: 'Incorrect password.' }
    setSession({ userId: student.id, role: 'student' })
    return { success: true }
  }, [students])

  const loginAsAdmin = useCallback((identifier: string, password: string) => {
    if (identifier.trim().toLowerCase() !== 'admin@vjti.ac.in') {
      return { success: false, error: 'Admin email not recognized.' }
    }
    if (password !== 'admin123') return { success: false, error: 'Incorrect password.' }
    setSession({ userId: 'admin_1', role: 'admin' })
    return { success: true }
  }, [])

  const loginStudent = useCallback((identifier: string) => {
    const normalized = identifier.trim().toLowerCase()
    const student = students.find((candidate) =>
      candidate.rollNo.toLowerCase() === normalized ||
      candidate.email.toLowerCase() === normalized
    )
    if (student) setSession({ userId: student.id, role: 'student' })
  }, [students])

  const logout = useCallback(() => setSession(null), [])

  const updateApplicationStatus = useCallback((
    id: string,
    requestedStatus: StudentStatus,
    options?: UpdateApplicationOptions | string
  ) => {
    const status = statusForApplication(requestedStatus)
    const application = applications.find((entry) => entry.id === id || entry.studentId === id)
    const studentId = application?.studentId ?? id
    const student = students.find((entry) => entry.id === studentId)
    const updateOptions = typeof options === 'string' ? { adminRemarks: options } : options

    setStudents((previous) => previous.map((entry) =>
      entry.id === studentId
        ? {
            ...entry,
            status,
            ...(updateOptions?.adminRemarks !== undefined ? { adminRemarks: updateOptions.adminRemarks } : {}),
            ...(updateOptions?.verifiedCgpa !== undefined ? { cgpa: updateOptions.verifiedCgpa } : {}),
          }
        : entry
    ))

    setApplications((previous) => {
      const target = previous.find((entry) => entry.studentId === studentId)
      if (!target && !student) return previous
      const targetId = target?.id ?? `app_${studentId}`
      const base = target ?? createApplications(student ? [student] : [])[0]
      if (!base) return previous
      const next: Application = {
        ...base,
        status,
        adminRemarks: updateOptions?.adminRemarks ?? base.adminRemarks,
        correctionNotes: updateOptions?.correctionNotes ?? base.correctionNotes,
        verifiedCgpa: updateOptions?.verifiedCgpa ?? base.verifiedCgpa,
        verifiedBy: updateOptions?.verifiedBy ?? base.verifiedBy,
        verifiedAt: updateOptions?.verifiedCgpa !== undefined ? new Date().toISOString() : base.verifiedAt,
      }
      return target
        ? previous.map((entry) => entry.id === targetId ? next : entry)
        : [...previous, next]
    })
  }, [applications, students])

  const createGroup = useCallback((studentId: string, maxSize: number) => {
    const student = students.find((entry) => entry.id === studentId)
    if (!student) return { success: false, error: 'Student record not found.' }
    if (student.status !== 'approved') return { success: false, error: 'Application must be approved before creating a group.' }
    if (groups.some((group) => group.members.some((member) => member.studentId === studentId))) {
      return { success: false, error: 'Student already belongs to a group.' }
    }
    if (maxSize !== 3 && maxSize !== 4) return { success: false, error: 'Group size must be 3 or 4.' }
    const group = makeGroup(`grp_${Date.now()}`, student, maxSize, [makeMember(student, true)])
    setGroups((previous) => [...previous, group])
    setStudents((previous) => previous.map((entry) =>
      entry.id === studentId ? { ...entry, groupId: group.id } : entry
    ))
    return { success: true }
  }, [groups, students])

  const joinGroup = useCallback((inviteCode: string, studentId: string) => {
    const student = students.find((entry) => entry.id === studentId)
    const group = groups.find((entry) => entry.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase())
    if (!student) return { success: false, error: 'Student record not found.' }
    if (student.status !== 'approved') return { success: false, error: 'Application must be approved before joining a group.' }
    if (!group) return { success: false, error: 'Group invite code not found.' }
    if (group.isLocked) return { success: false, error: 'This group is locked.' }
    if (group.members.length >= group.maxSize) return { success: false, error: 'This group is full.' }
    if (groups.some((entry) => entry.members.some((member) => member.studentId === studentId))) {
      return { success: false, error: 'Student already belongs to a group.' }
    }
    setGroups((previous) => previous.map((entry) => {
      if (entry.id !== group.id) return entry
      const members = [...entry.members, makeMember(student)]
      return {
        ...entry,
        members,
        averageCgpa: averageCgpa(members),
        status: members.length >= 3 ? 'complete' : 'open',
      }
    }))
    setStudents((previous) => previous.map((entry) =>
      entry.id === studentId ? { ...entry, groupId: group.id } : entry
    ))
    return { success: true }
  }, [groups, students])

  const createOrJoinGroup = useCallback((studentId: string, targetRollNo: string) => {
    const target = students.find((entry) => entry.rollNo.trim().toUpperCase() === targetRollNo.trim().toUpperCase())
    if (!target) return { success: false, message: 'Roll number not found in college records.' }
    if (target.status !== 'approved') return { success: false, message: 'Student application is not approved.' }
    if (groups.some((group) => group.members.some((member) => member.studentId === target.id))) {
      return { success: false, message: 'Student already belongs to a group.' }
    }
    const existingGroup = groups.find((group) => group.members.some((member) => member.studentId === studentId))
    if (existingGroup) {
      const result = joinGroup(existingGroup.inviteCode, target.id)
      return { success: result.success, message: result.error ?? `Added ${target.name} successfully.` }
    }
    const initiator = students.find((entry) => entry.id === studentId)
    if (!initiator) return { success: false, message: 'Initiator student record not found.' }
    const group = makeGroup(`grp_${Date.now()}`, initiator, 4, [makeMember(initiator, true), makeMember(target)])
    setGroups((previous) => [...previous, group])
    setStudents((previous) => previous.map((entry) =>
      entry.id === studentId || entry.id === target.id ? { ...entry, groupId: group.id } : entry
    ))
    return { success: true, message: `Added ${target.name} successfully.` }
  }, [groups, joinGroup, students])

  const leaveGroup = useCallback((studentId: string) => {
    const group = groups.find((entry) => entry.members.some((member) => member.studentId === studentId))
    if (!group) return { success: false, error: 'Student is not in a group.' }
    if (group.isLocked) return { success: false, error: 'Locked groups cannot be changed.' }
    if (group.headStudentId === studentId) return { success: false, error: 'The group leader cannot leave the group.' }
    const members = group.members.filter((member) => member.studentId !== studentId)
    setGroups((previous) => previous
      .map((entry) => entry.id === group.id ? { ...entry, members, averageCgpa: averageCgpa(members) } : entry)
      .filter((entry) => entry.members.length > 0))
    setStudents((previous) => previous.map((entry) =>
      entry.id === studentId ? { ...entry, groupId: undefined } : entry
    ))
    return { success: true }
  }, [groups])

  const lockGroup = useCallback((groupId: string) => {
    const group = groups.find((entry) => entry.id === groupId)
    if (!group) return { success: false, error: 'Group not found.' }
    if (group.members.length < 3) return { success: false, error: 'At least 3 members are required to lock a group.' }
    setGroups((previous) => previous.map((entry) =>
      entry.id === groupId ? { ...entry, isLocked: true, status: 'locked' } : entry
    ))
    return { success: true }
  }, [groups])

  const savePreferences = useCallback((groupId: string, preferences: string[]) => {
    setGroups((previous) => previous.map((group) =>
      group.id === groupId ? { ...group, preferences: [...preferences], isLocked: true, status: 'locked' } : group
    ))
  }, [])

  const runAllocationRound = useCallback(() => {
    const nextRooms = rooms.map((room) => ({ ...room }))
    const nextGroups = groups.map((group) => ({ ...group }))
    const ranked = nextGroups
      .filter((group) => group.allocationStatus === 'pending' && group.preferences.length > 0)
      .sort((left, right) => right.averageCgpa - left.averageCgpa)

    for (const group of ranked) {
      const room = group.preferences
        .map((id) => nextRooms.find((candidate) => candidate.id === id))
        .find((candidate) => candidate?.status === 'available' && candidate.capacity >= group.members.length)
      if (!room) {
        group.allocationStatus = 'unallotted'
        continue
      }
      room.status = 'occupied'
      room.allottedGroupId = group.id
      group.allottedRoomId = room.id
      group.allocationStatus = 'allotted'
    }

    setRooms(nextRooms)
    setGroups(nextGroups)
    setCurrentRound((round) => round + 1)
  }, [groups, rooms])

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setStudents(INITIAL_STUDENTS)
    setApplications(createApplications(INITIAL_STUDENTS))
    setRooms(INITIAL_ROOMS)
    setGroups(INITIAL_GROUPS)
    setCurrentRound(1)
    setSession(DEFAULT_STUDENT_ID ? { userId: DEFAULT_STUDENT_ID, role: 'student' } : null)
    setGroupsPublished(false)
  }, [])

  const value: MockDataContextValue = {
    session,
    applications,
    students,
    rooms,
    groups,
    currentStudent,
    currentRound,
    isHydrated: hydrated,
    groupsPublished,
    loginAsStudent,
    loginAsAdmin,
    loginStudent,
    logout,
    updateApplicationStatus,
    createOrJoinGroup,
    createGroup,
    joinGroup,
    leaveGroup,
    lockGroup,
    savePreferences,
    runAllocationRound,
    resetAllData,
  }

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>
}

export function useMockData(): MockDataContextValue {
  const context = useContext(MockDataContext)
  if (!context) throw new Error('useMockData must be used inside MockDataProvider')
  return context
}
