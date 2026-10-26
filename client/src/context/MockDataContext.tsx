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
import type { RoundStatus, TieBreakRule } from '@prisma/client'
import { createClient } from '@/utils/supabase/client'
import type {
  Application,
  AuthSession,
  GroupMember,
  Room,
  StudentGroup,
  StudentProfile,
  StudentStatus,
  UpdateApplicationOptions,
} from '@/lib/types'

interface ApiFailure extends Error {
  code?: string
}

interface GroupStatusPayload {
  group: Record<string, unknown> | null
  allocation: { status: string; nextStep: string | null }
}

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
  loading: boolean
  error: string | null
  allocationStatus: { status: string; nextStep: string | null } | null
  currentRoundId: string | null
  currentRoundStatus: RoundStatus | null
  currentRoundDeadline: string
  currentTieBreakRule: TieBreakRule
  roundHistory: Array<Record<string, unknown>>
  openGroups: StudentGroup[]
  unallottedStudents: Array<Record<string, unknown>>
  auditLog: Array<Record<string, unknown>>
  availableRooms: Array<Record<string, unknown>>
  loginAsStudent: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginAsAdmin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginStudent: (identifier: string) => Promise<void>
  logout: () => Promise<void>
  refreshData: () => Promise<void>
  updateApplicationStatus: (
    id: string,
    status: StudentStatus,
    options?: UpdateApplicationOptions | string
  ) => Promise<void>
  submitApplication: (input: {
    phone: string
    address: { street: string; city: string; state: string; pincode: string }
  }) => Promise<void>
  createOrJoinGroup: (studentId: string, targetGroupId: string) => Promise<{ success: boolean; message: string }>
  createGroup: (studentId: string, maxSize: number) => Promise<{ success: boolean; error?: string }>
  joinGroup: (groupId: string, studentId: string) => Promise<{ success: boolean; error?: string }>
  leaveGroup: (studentId: string) => Promise<{ success: boolean; error?: string }>
  dissolveGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>
  lockGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>
  savePreferences: (groupId: string, preferences: string[]) => Promise<void>
  runAllocationRound: () => Promise<void>
  createRound: (deadline: string, tieBreakRule: TieBreakRule) => Promise<void>
  updateRoundSettings: (deadline: string, tieBreakRule: TieBreakRule) => Promise<void>
  openRound: () => Promise<void>
  closeFormation: () => Promise<void>
  publishRound: () => Promise<void>
  closeRound: () => Promise<void>
  cancelAllotment: (groupId: string, reason: string) => Promise<void>
  resetAllData: () => void
}

const MockDataContext = createContext<MockDataContextValue | null>(null)
const supabase = createClient()

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function mapStatus(status: unknown): StudentStatus {
  switch (status) {
    case 'APPROVED': return 'approved'
    case 'SUBMITTED': return 'application_submitted'
    case 'REJECTED': return 'rejected'
    default: return 'draft'
  }
}

function mapStudent(payload: unknown): StudentProfile {
  const value = object(payload)
  const address = object(value.address)
  const application = object(value.application)
  const user = object(value.user)
  return {
    id: String(value.id ?? ''),
    name: String(value.name ?? ''),
    rollNo: String(value.rollNo ?? ''),
    email: String(user.email ?? ''),
    branch: String(value.branch ?? ''),
    year: Number(value.year ?? 1),
    cgpa: Number(value.cgpa ?? 0),
    phone: String(value.phone ?? ''),
    address: {
      street: String(address.street ?? ''),
      city: String(address.city ?? ''),
      state: String(address.state ?? ''),
      pincode: String(address.pincode ?? ''),
    },
    status: object(application.documents).applicationStatusOverride === 'correction_required'
      ? 'correction_required'
      : object(application.documents).applicationStatusOverride === 'under_review'
        ? 'under_review'
        : mapStatus(application.status),
    adminRemarks: typeof application.adminRemarks === 'string' ? application.adminRemarks : undefined,
  }
}

function mapRoom(payload: unknown): Room {
  const value = object(payload)
  const block = object(value.block)
  const hostel = object(block.hostel)
  const status = String(value.status ?? 'AVAILABLE').toLowerCase()
  return {
    id: String(value.id ?? ''),
    roomNumber: String(value.roomNumber ?? ''),
    block: String(block.name ?? 'A') as Room['block'],
    floor: Number(value.floor ?? 1),
    capacity: Number(value.capacity ?? 4),
    status: status === 'occupied' || status === 'reserved' ? status : 'available',
    allottedGroupId: typeof value.allottedGroupId === 'string' ? value.allottedGroupId : undefined,
    x: Number(value.x ?? 0),
    y: Number(value.y ?? 0),
    width: Number(value.width ?? 80),
    height: Number(value.height ?? 80),
    hostelId: String(hostel.id ?? ''),
    hostelName: String(hostel.name ?? ''),
  }
}

function mapGroup(payload: unknown): StudentGroup {
  const value = object(payload)
  const members = Array.isArray(value.members) ? value.members : []
  const mappedMembers: GroupMember[] = members.map((payloadMember) => {
    const member = object(payloadMember)
    const student = object(member.student)
    return {
      studentId: String(student.id ?? ''),
      name: String(student.name ?? ''),
      rollNo: String(student.rollNo ?? ''),
      rollNumber: String(student.rollNo ?? ''),
      branch: String(student.branch ?? ''),
      year: Number(student.year ?? 1),
      cgpa: Number(student.cgpa ?? 0),
      verifiedCgpa: Number(student.cgpa ?? 0),
      isLeader: member.isLeader === true,
      isHead: member.isLeader === true,
    }
  })
  const status = String(value.status ?? 'FORMING')
  const room = object(value.room)
  return {
    id: String(value.id ?? ''),
    leaderId: mappedMembers.find((member) => member.isLeader)?.studentId ?? '',
    headStudentId: mappedMembers.find((member) => member.isLeader)?.studentId ?? '',
    inviteCode: String(value.id ?? ''),
    maxSize: 4,
    status: status === 'FORMING' ? 'open' : status === 'SUBMITTED' ? 'complete' : 'locked',
    members: mappedMembers,
    averageCgpa: Number(value.averageCgpa ?? 0),
    isLocked: status !== 'FORMING',
    preferences: Array.isArray(value.preferences) ? value.preferences.filter((id): id is string => typeof id === 'string') : [],
    allottedRoomId: typeof room.id === 'string' ? room.id : undefined,
    allottedRoomNumber: typeof room.roomNumber === 'string' ? room.roomNumber : undefined,
    allocationStatus: status === 'ALLOTTED'
      ? 'allotted'
      : status === 'UNALLOTTED'
        ? 'unallotted'
        : 'pending',
  }
}

function mapApplication(student: StudentProfile, payload?: unknown): Application {
  const value = object(payload)
  const documents = object(value.documents)
  const details = object(documents.applicationDetails)
  const address = object(details.address)
  return {
    id: String(value.id ?? ''),
    studentId: student.id,
    personal: {
      fullName: student.name,
      rollNumber: student.rollNo,
      branch: student.branch,
      year: String(student.year),
      phone: String(details.phone ?? student.phone),
      email: student.email,
      parentName: '',
      parentPhone: '',
    },
    address: {
      permanentAddress: String(address.street ?? student.address.street),
      city: String(address.city ?? student.address.city),
      state: String(address.state ?? student.address.state),
      pincode: String(address.pincode ?? student.address.pincode),
    },
    academic: {
      selfReportedCgpa: String(student.cgpa),
      previousSemPercentage: '',
      activeBacklogs: '0',
    },
    documents: {
      aadharCard: null,
      marksheet: null,
      feeReceipt: null,
      studentIdCard: null,
      hostelIdCard: null,
      otherDocs: [],
    },
    status: student.status,
    submittedAt: typeof value.submittedAt === 'string' ? value.submittedAt : null,
    adminRemarks: typeof value.adminRemarks === 'string' ? value.adminRemarks : '',
    correctionNotes: String(documents.correctionNotes ?? ''),
    verifiedCgpa: student.status === 'approved' ? student.cgpa : null,
    verifiedBy: null,
    verifiedAt: null,
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const value = object(payload)
    const error = new Error(
      typeof value.error === 'string' ? value.error : `Request failed (${response.status}).`,
    ) as ApiFailure
    error.code = typeof value.code === 'string' ? value.code : undefined
    throw error
  }
  return payload as T
}

async function post(path: string, body?: unknown) {
  return api<unknown>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [groups, setGroups] = useState<StudentGroup[]>([])
  const [openGroups, setOpenGroups] = useState<StudentGroup[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)
  const [currentRoundStatus, setCurrentRoundStatus] = useState<RoundStatus | null>(null)
  const [currentRoundDeadline, setCurrentRoundDeadline] = useState('')
  const [roundHistory, setRoundHistory] = useState<Array<Record<string, unknown>>>([])
  const [currentTieBreakRule, setCurrentTieBreakRule] =
    useState<TieBreakRule>('MAX_CGPA_THEN_ROLL_NO')
  const [unallottedStudents, setUnallottedStudents] = useState<Array<Record<string, unknown>>>([])
  const [auditLog, setAuditLog] = useState<Array<Record<string, unknown>>>([])
  const [availableRooms, setAvailableRooms] = useState<Array<Record<string, unknown>>>([])
  const [allocationStatus, setAllocationStatus] = useState<{ status: string; nextStep: string | null } | null>(null)
  const [groupsPublished, setGroupsPublished] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStudent = useMemo(
    () => students.find((student) => student.id === session?.userId) ?? null,
    [students, session],
  )

  const refreshData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      if (session.role === 'student') {
        const [profile, ownGroup, rawRooms, rawOpenGroups] = await Promise.all([
          api<Record<string, unknown>>('/api/students/me'),
          api<GroupStatusPayload>('/api/groups/me'),
          api<unknown[]>('/api/rooms'),
          api<unknown[]>('/api/groups/open'),
        ])
        const student = mapStudent(profile)
        setSession((current) =>
          current && current.userId !== student.id ? { ...current, userId: student.id } : current,
        )
        setStudents([student])
        setApplications([mapApplication(student, profile.application)])
        setRooms(rawRooms.map(mapRoom))
        setRoundHistory([])
        setUnallottedStudents([])
        setAuditLog([])
        setAvailableRooms([])
        setGroups(ownGroup.group ? [mapGroup(ownGroup.group)] : [])
        setAllocationStatus(ownGroup.allocation)
        setOpenGroups(rawOpenGroups.map(mapGroup))
        const ownGroupValue = object(ownGroup.group)
        const round = object(ownGroupValue.round)
        setGroupsPublished(round.status === 'PUBLISHED' || round.status === 'CLOSED')
      } else {
        const [roundList, applicationList] = await Promise.all([
          api<unknown[]>('/api/admin/rounds'),
          api<unknown[]>('/api/admin/applications'),
        ])
        setRoundHistory(roundList.map(object))
        const applicationRows = applicationList.map((payload) => {
          const value = object(payload)
          const student = mapStudent(value)
          return { student, application: mapApplication(student, value.application) }
        })
        setStudents(applicationRows.map((row) => row.student))
        setApplications(applicationRows.map((row) => row.application))
        const latest = roundList.length ? object(roundList[0]) : null
        if (!latest) {
          setCurrentRound(0)
          setCurrentRoundId(null)
          setCurrentRoundStatus(null)
          setGroups([])
        } else {
          const roundId = String(latest.id)
          const round = await api<Record<string, unknown>>(`/api/admin/rounds/${roundId}`)
          const roundGroups = Array.isArray(round.groups) ? round.groups : []
          const snapshots = Array.isArray(round.snapshots) ? round.snapshots : []
          const snapshotByGroup = new Map(snapshots.map((snapshot) => {
            const value = object(snapshot)
            return [String(value.groupId), value]
          }))
          setGroups(roundGroups.map((rawGroup) => {
            const group = object(rawGroup)
            const mapped = mapGroup(group)
            const snapshot = snapshotByGroup.get(mapped.id)
            if (!snapshot) return mapped
            const savedStatus = String(snapshot.result)
            return {
              ...mapped,
              averageCgpa: Number(snapshot.averageCgpa ?? mapped.averageCgpa),
              meritRank: Number(snapshot.rank ?? 0) || undefined,
              tieBreakNote: typeof snapshot.tieBreakNote === 'string' ? snapshot.tieBreakNote : undefined,
              allocationReason: typeof snapshot.reason === 'string' ? snapshot.reason : undefined,
              allocationStatus: savedStatus === 'ALLOTTED' ? 'allotted' : 'unallotted',
            }
          }))
          setCurrentRound(Number(latest.number))
          setCurrentRoundId(roundId)
          setCurrentRoundStatus(latest.status as RoundStatus)
          setCurrentRoundDeadline(typeof latest.formationDeadline === 'string' ? latest.formationDeadline : '')
          setCurrentTieBreakRule(latest.tieBreakRule as TieBreakRule)
        }
        const [unallotted, inventory, audit] = await Promise.all([
          api<unknown[]>('/api/admin/unallotted'),
          api<unknown[]>('/api/admin/rooms/available'),
          api<unknown[]>('/api/admin/audit'),
        ])
        setUnallottedStudents(unallotted.map(object))
        setAvailableRooms(inventory.map(object))
        setAuditLog(audit.map(object))
        setRooms(inventory.map(mapRoom))
        setGroupsPublished(latest?.status === 'PUBLISHED' || latest?.status === 'CLOSED')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to load portal data.'
      setError(message)
    } finally {
      setLoading(false)
      setIsHydrated(true)
    }
  }, [session])

  const loadPortalUser = useCallback(async () => {
    try {
      const user = await api<Record<string, unknown>>('/api/auth/me')
      const role = user.role === 'STUDENT' ? 'student' : 'admin'
      if (role === 'student') {
        const profile = await api<Record<string, unknown>>('/api/students/me')
        setSession({ userId: String(profile.id), role })
      } else {
        setSession({ userId: String(user.id), role })
      }
    } catch (cause) {
      const failure = cause as ApiFailure
      if (failure.code !== 'UNAUTHENTICATED') {
        setError(cause instanceof Error ? cause.message : 'Unable to verify your portal account.')
      }
      setSession(null)
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError
      if (active && data.session) void loadPortalUser()
      else if (active) setIsHydrated(true)
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : 'Unable to restore the session.')
        setIsHydrated(true)
      }
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) void loadPortalUser()
      else {
        setSession(null)
        setStudents([])
        setApplications([])
        setGroups([])
        setOpenGroups([])
        setRooms([])
        setRoundHistory([])
        setUnallottedStudents([])
        setAuditLog([])
        setAvailableRooms([])
        setIsHydrated(true)
      }
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadPortalUser])

  useEffect(() => {
    let active = true
    if (session) {
      queueMicrotask(() => {
        if (active) void refreshData()
      })
    }
    return () => { active = false }
  }, [session, refreshData])

  const signIn = useCallback(async (
    identifier: string,
    password: string,
    expectedRole: 'student' | 'admin',
  ) => {
    try {
      let email = identifier.trim()
      if (expectedRole === 'student' && !email.includes('@')) {
        const resolved = await api<{ email: string }>(
          `/api/students/lookup?rollNo=${encodeURIComponent(email)}`,
        )
        email = resolved.email
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      const user = await api<Record<string, unknown>>('/api/auth/me')
      const actualRole = user.role === 'STUDENT' ? 'student' : 'admin'
      if (actualRole !== expectedRole) {
        await supabase.auth.signOut()
        throw new Error('This account does not have access to the selected portal.')
      }
      setError(null)
      if (actualRole === 'student') {
        const profile = await api<Record<string, unknown>>('/api/students/me')
        setSession({ userId: String(profile.id), role: actualRole })
      } else {
        setSession({ userId: String(user.id), role: actualRole })
      }
      setIsHydrated(true)
      return { success: true }
    } catch (cause) {
      return {
        success: false,
        error: cause instanceof Error ? cause.message : 'Sign in failed.',
      }
    }
  }, [])

  const loginAsStudent = useCallback(
    (identifier: string, password: string) => signIn(identifier, password, 'student'),
    [signIn],
  )
  const loginAsAdmin = useCallback(
    (identifier: string, password: string) => signIn(identifier, password, 'admin'),
    [signIn],
  )
  const loginStudent = useCallback(async (identifier: string) => {
    const result = await loginAsStudent(identifier, '')
    if (!result.success) throw new Error(result.error ?? 'Sign in failed.')
  }, [loginAsStudent])
  const logout = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
    setSession(null)
  }, [])

  const refreshAfterMutation = useCallback(async () => {
    await refreshData()
  }, [refreshData])

  const createGroup = useCallback(async (studentId: string, maxSize: number) => {
    if (studentId !== currentStudent?.id) {
      return { success: false, error: 'You can only create a group for your signed-in account.' }
    }
    if (maxSize !== 3 && maxSize !== 4) {
      return { success: false, error: 'A group must have a size of 3 or 4.' }
    }
    try {
      await post('/api/groups', {})
      await refreshAfterMutation()
      return { success: true }
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Could not create group.' }
    }
  }, [currentStudent?.id, refreshAfterMutation])

  const joinGroup = useCallback(async (groupId: string, studentId: string) => {
    if (studentId !== currentStudent?.id) {
      return { success: false, error: 'You can only join a group using your signed-in account.' }
    }
    try {
      await post('/api/groups/join', { groupId })
      await refreshAfterMutation()
      return { success: true }
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Could not join group.' }
    }
  }, [currentStudent?.id, refreshAfterMutation])

  const createOrJoinGroup = useCallback(async (studentId: string, groupId: string) => {
    const result = await joinGroup(groupId, studentId)
    return { success: result.success, message: result.error ?? 'Joined the group successfully.' }
  }, [joinGroup])

  const leaveGroup = useCallback(async (studentId: string) => {
    if (studentId !== currentStudent?.id) {
      return { success: false, error: 'You can only leave a group using your signed-in account.' }
    }
    const group = groups[0]
    if (!group) return { success: false, error: 'You are not currently in a group.' }
    try {
      await post(`/api/groups/${group.id}/leave`)
      await refreshAfterMutation()
      return { success: true }
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Could not leave group.' }
    }
  }, [currentStudent?.id, groups, refreshAfterMutation])

  const dissolveGroup = useCallback(async (groupId: string) => {
    try {
      await post(`/api/groups/${groupId}/dissolve`)
      await refreshAfterMutation()
      return { success: true }
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Could not dissolve group.' }
    }
  }, [refreshAfterMutation])

  const lockGroup = useCallback(async (groupId: string) => {
    try {
      await post(`/api/groups/${groupId}/submit`)
      await refreshAfterMutation()
      return { success: true }
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : 'Could not submit group.' }
    }
  }, [refreshAfterMutation])

  const savePreferences = useCallback(async (groupId: string, preferences: string[]) => {
    await api(`/api/groups/${groupId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    })
    await refreshAfterMutation()
  }, [refreshAfterMutation])

  const runAllocationRound = useCallback(async () => {
    if (!currentRoundId) throw new Error('There is no round selected for allocation.')
    await post(`/api/admin/rounds/${currentRoundId}/allocate`)
    await refreshAfterMutation()
  }, [currentRoundId, refreshAfterMutation])

  const adminRoundAction = useCallback(async (action: string) => {
    if (!currentRoundId) throw new Error('There is no current round.')
    await post(`/api/admin/rounds/${currentRoundId}/${action}`)
    await refreshAfterMutation()
  }, [currentRoundId, refreshAfterMutation])

  const createRound = useCallback(async (deadline: string, tieBreakRule: TieBreakRule) => {
    await post('/api/admin/rounds', { formationDeadline: new Date(deadline).toISOString(), tieBreakRule })
    await refreshAfterMutation()
  }, [refreshAfterMutation])

  const updateRoundSettings = useCallback(async (deadline: string, tieBreakRule: TieBreakRule) => {
    if (!currentRoundId) throw new Error('There is no current round.')
    await api(`/api/admin/rounds/${currentRoundId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ formationDeadline: new Date(deadline).toISOString(), tieBreakRule }),
    })
    await refreshAfterMutation()
  }, [currentRoundId, refreshAfterMutation])

  const cancelAllotment = useCallback(async (groupId: string, reason: string) => {
    if (!currentRoundId) throw new Error('There is no current round.')
    await post(`/api/admin/rounds/${currentRoundId}/cancel-allotment`, { groupId, reason })
    await refreshAfterMutation()
  }, [currentRoundId, refreshAfterMutation])

  const updateApplicationStatus = useCallback(async (
    id: string,
    status: StudentStatus,
    options?: UpdateApplicationOptions | string,
  ) => {
    const adminOptions = typeof options === 'string' ? { adminRemarks: options } : options ?? {}
    const apiStatus =
      status === 'approved' ? 'approved'
        : status === 'rejected' ? 'rejected'
          : status === 'correction_required' ? 'correction_required'
            : status === 'under_review' ? 'under_review'
              : 'under_review'
    await api(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: apiStatus,
        adminRemarks: adminOptions.adminRemarks,
        correctionNotes: adminOptions.correctionNotes,
        verifiedCgpa: adminOptions.verifiedCgpa,
      }),
    })
    await refreshAfterMutation()
  }, [refreshAfterMutation])

  const submitApplication = useCallback(async (input: {
    phone: string
    address: { street: string; city: string; state: string; pincode: string }
  }) => {
    await post('/api/applications/me', input)
    await refreshAfterMutation()
  }, [refreshAfterMutation])

  const value: MockDataContextValue = {
    session,
    applications,
    students,
    rooms,
    groups,
    currentStudent,
    currentRound,
    isHydrated,
    groupsPublished,
    loading,
    error,
    allocationStatus,
    currentRoundId,
    currentRoundStatus,
    currentRoundDeadline,
    currentTieBreakRule,
    roundHistory,
    openGroups,
    unallottedStudents,
    auditLog,
    availableRooms,
    loginAsStudent,
    loginAsAdmin,
    loginStudent,
    logout,
    refreshData,
    updateApplicationStatus,
    submitApplication,
    createOrJoinGroup,
    createGroup,
    joinGroup,
    leaveGroup,
    dissolveGroup,
    lockGroup,
    savePreferences,
    runAllocationRound,
    createRound,
    updateRoundSettings,
    openRound: () => adminRoundAction('open'),
    closeFormation: () => adminRoundAction('close-formation'),
    publishRound: () => adminRoundAction('publish'),
    closeRound: () => adminRoundAction('close'),
    cancelAllotment,
    resetAllData: () => setError('Resetting production records is not supported.'),
  }

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>
}

export function useMockData(): MockDataContextValue {
  const context = useContext(MockDataContext)
  if (!context) throw new Error('useMockData must be used inside MockDataProvider')
  return context
}
