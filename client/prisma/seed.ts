import { createClient } from '@supabase/supabase-js'
import { PrismaClient, type Gender, type Role } from '@prisma/client'

const prisma = new PrismaClient()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoPassword = 'HostelDemo2026!'
const studentCountPerGender = 60

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.',
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const maleNames = [
  'Aarav', 'Aditya', 'Akash', 'Aman', 'Arjun', 'Arnav', 'Atharv', 'Ayush',
  'Dev', 'Dhruv', 'Ishaan', 'Karan', 'Krishna', 'Manish', 'Mohit', 'Nikhil',
  'Pranav', 'Rahul', 'Rohan', 'Sahil', 'Shivam', 'Shreyas', 'Siddharth',
  'Tanmay', 'Varun', 'Vedant', 'Vikram', 'Yash', 'Abhishek', 'Aniket',
  'Chirag', 'Harsh', 'Kabir', 'Madhav', 'Neel', 'Parth', 'Ritvik', 'Samar',
  'Shaurya', 'Vihaan', 'Adit', 'Anirudh', 'Dinesh', 'Gaurav', 'Jay',
  'Kunal', 'Omkar', 'Pratik', 'Sanjay', 'Uday', 'Vivek', 'Akhil', 'Bharat',
  'Deepak', 'Ibrahim', 'Lakshya', 'Naveen', 'Raghav', 'Sameer', 'Tarun',
]

const femaleNames = [
  'Ananya', 'Aditi', 'Aishwarya', 'Amrita', 'Anika', 'Anjali', 'Avani',
  'Bhavya', 'Diya', 'Isha', 'Kavya', 'Khushi', 'Meera', 'Nandini', 'Neha',
  'Pooja', 'Priya', 'Riya', 'Saanvi', 'Sakshi', 'Shreya', 'Simran', 'Tanvi',
  'Vaishnavi', 'Zoya', 'Aarohi', 'Charu', 'Divya', 'Gauri', 'Ira', 'Jhanvi',
  'Kirti', 'Lakshmi', 'Mahi', 'Mira', 'Nisha', 'Pallavi', 'Radhika', 'Sanya',
  'Trisha', 'Vanya', 'Aparna', 'Bhumika', 'Harini', 'Jyoti', 'Madhuri',
  'Namrata', 'Payal', 'Revathi', 'Suhani', 'Vasudha', 'Ayesha', 'Deepa',
  'Indira', 'Kritika', 'Leela', 'Pavitra', 'Ritu', 'Sonal', 'Uma',
]

const surnames = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Mehta', 'Nair', 'Desai', 'Rao',
  'Kulkarni', 'Verma', 'Joshi', 'Pillai', 'Gupta', 'Singh', 'Chatterjee',
  'Menon', 'Khan', 'Mishra', 'Kapoor', 'Bose', 'Naidu', 'Jain', 'Das',
  'Malhotra', 'Shetty', 'Banerjee', 'Chauhan', 'Kumar', 'Saxena', 'Ghosh',
]

const branches = ['Computer Engineering', 'Electronics', 'Mechanical', 'Civil', 'Electrical']
const cities = [
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
  { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
]

const staffAccounts = [
  { name: 'Hostel Administrator', email: 'admin@hostel-demo.edu', role: 'ADMIN' as const },
  { name: 'Hostel Warden', email: 'warden@hostel-demo.edu', role: 'WARDEN' as const },
]

const hostels = [
  { name: 'VJTI Boys Hostel North', gender: 'MALE' as const },
  { name: 'VJTI Boys Hostel South', gender: 'MALE' as const },
  { name: 'VJTI Girls Hostel East', gender: 'FEMALE' as const },
  { name: 'VJTI Girls Hostel West', gender: 'FEMALE' as const },
]

interface SeedAccount {
  email: string
  name: string
  role: Role
  student?: {
    rollNo: string
    branch: string
    year: number
    cgpa: number
    phone: string
    gender: Gender
    address: {
      street: string
      city: string
      state: string
      pincode: string
    }
  }
}

function makeStudent(index: number, gender: Gender): SeedAccount {
  const names = gender === 'MALE' ? maleNames : femaleNames
  const givenName = names[index % names.length]
  const surname = surnames[(index * 7) % surnames.length]
  const rollNo = `2026BCE${index + (gender === 'FEMALE' ? 1061 : 1001)}`
  const location = cities[(index * 3 + (gender === 'FEMALE' ? 4 : 0)) % cities.length]
  const normalizedName = `${givenName}.${surname}`.toLowerCase()

  return {
    email: `${normalizedName}.${rollNo.toLowerCase()}@college.edu`,
    name: `${givenName} ${surname}`,
    role: 'STUDENT',
    student: {
      rollNo,
      branch: branches[(index * 3) % branches.length],
      year: (index % 4) + 1,
      cgpa: Number((6.15 + ((index * 37) % 385) / 100).toFixed(2)),
      phone: `90000${String(index + (gender === 'FEMALE' ? 61 : 1)).padStart(5, '0')}`,
      gender,
      address: {
        street: `${12 + index} ${['MG Road', 'Station Road', 'College Road', 'Lake View Road'][index % 4]}`,
        ...location,
      },
    },
  }
}

async function listAuthUsers() {
  const users = []
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw error

    users.push(...data.users)
    if (data.users.length < 1000) return users
    page += 1
  }
}

async function processInBatches<T>(
  items: readonly T[],
  batchSize: number,
  processItem: (item: T) => Promise<void>,
) {
  for (let start = 0; start < items.length; start += batchSize) {
    await Promise.all(items.slice(start, start + batchSize).map(processItem))
  }
}

async function ensureAuthUser(
  account: SeedAccount,
  knownUsers: Map<string, string>,
) {
  const existingId = knownUsers.get(account.email.toLowerCase())

  if (existingId) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingId, {
      email: account.email,
      email_confirm: true,
      password: demoPassword,
      app_metadata: { role: account.role },
    })
    if (error) throw error
    return data.user.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: demoPassword,
    email_confirm: true,
    app_metadata: { role: account.role },
    user_metadata: { name: account.name },
  })
  if (error) throw error

  knownUsers.set(account.email.toLowerCase(), data.user.id)
  return data.user.id
}

async function seedAccount(account: SeedAccount, authUsers: Map<string, string>) {
  const supabaseAuthId = await ensureAuthUser(account, authUsers)
  const user = await prisma.user.upsert({
    where: { email: account.email },
    update: { supabaseAuthId, role: account.role },
    create: { supabaseAuthId, email: account.email, role: account.role },
  })

  if (!account.student) return

  await prisma.student.upsert({
    where: { rollNo: account.student.rollNo },
    update: {
      userId: user.id,
      name: account.name,
      branch: account.student.branch,
      year: account.student.year,
      cgpa: account.student.cgpa,
      phone: account.student.phone,
      gender: account.student.gender,
      address: account.student.address,
    },
    create: {
      userId: user.id,
      name: account.name,
      ...account.student,
    },
  })
}

async function seedHostelsAndRooms() {
  const rooms: {
    roomNumber: string
    blockId: string
    floor: number
    capacity: number
    x: number
    y: number
    width: number
    height: number
  }[] = []

  for (const [hostelIndex, hostelData] of hostels.entries()) {
    const hostel = await prisma.hostel.upsert({
      where: { name: hostelData.name },
      update: { gender: hostelData.gender },
      create: hostelData,
    })

    for (const blockName of ['A', 'B']) {
      const block = await prisma.block.upsert({
        where: { name_hostelId: { name: blockName, hostelId: hostel.id } },
        update: {},
        create: { name: blockName, hostelId: hostel.id },
      })

      for (let floor = 1; floor <= 5; floor += 1) {
        for (let position = 0; position < 5; position += 1) {
          const roomNumber = `${blockName}${floor}${String(position + 1).padStart(2, '0')}`
          rooms.push({
            roomNumber,
            blockId: block.id,
            floor,
            capacity: (hostelIndex + (blockName === 'B' ? 1 : 0) + floor + position) % 2 === 0 ? 3 : 4,
            x: 24 + (position % 3) * 112,
            y: 24 + Math.floor(position / 3) * 100,
            width: 96,
            height: 80,
          })
        }
      }
    }
  }

  await processInBatches(rooms, 20, async ({ roomNumber, blockId, ...roomData }) => {
    await prisma.room.upsert({
      where: { roomNumber_blockId: { roomNumber, blockId } },
      update: roomData,
      create: { roomNumber, blockId, ...roomData },
    })
  })
}

async function main() {
  const authUsers = new Map(
    (await listAuthUsers()).map((user) => [user.email?.toLowerCase() ?? '', user.id]),
  )

  const studentAccounts: SeedAccount[] = []
  for (let index = 0; index < studentCountPerGender; index += 1) {
    studentAccounts.push(makeStudent(index, 'MALE'), makeStudent(index, 'FEMALE'))
  }

  await processInBatches(
    [...staffAccounts, ...studentAccounts],
    10,
    (account) => seedAccount(account, authUsers),
  )
  await seedHostelsAndRooms()

  console.log('Demo seed complete: 120 students, 4 hostels, and 200 rooms.')
  console.log('No student groups or room allotments were created.')
  console.log(`Shared demo password: ${demoPassword}`)
  for (const account of staffAccounts) {
    console.log(`${account.role}: ${account.email}`)
  }
  console.log(`Male student: ${makeStudent(0, 'MALE').email}`)
  console.log(`Female student: ${makeStudent(0, 'FEMALE').email}`)
}

main()
  .catch((error: unknown) => {
    console.error('Demo seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
