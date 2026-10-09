import { User } from './types';

export const INITIAL_STAFF_ROSTER: User[] = [
  // Administrator Account
  {
    id: 'u-admin',
    uNumber: 'ADMIN',
    name: 'Administrator',
    email: 'admin@compliance.system',
    isAls: true,
    isLead: true,
    isAdmin: true,
    department: 'System Administration',
    title: 'System Administrator'
  },
  // Page 1
  {
    id: 'u-086936',
    uNumber: 'U086936',
    name: 'Shashi Srivastava',
    email: 'shashi.srivastava@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Station Operations / Compliance',
    title: 'Lead Station Director'
  },
  {
    id: 'u-788460',
    uNumber: 'U788460',
    name: 'Sweta Khaneja',
    email: 'sweta.khaneja@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Quality Assurance & Standards',
    title: 'Lead Quality Auditor'
  },
  {
    id: 'u-086575',
    uNumber: 'U086575',
    name: 'Sanjay Jan',
    email: 'sanjay.jan@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Ground Operations',
    title: 'Operations Lead'
  },
  {
    id: 'u-702475',
    uNumber: 'U702475',
    name: 'Rajan Nangia',
    email: 'rajan.nangia@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Aviation Compliance',
    title: 'Compliance Manager'
  },
  {
    id: 'u-778315',
    uNumber: 'U778315',
    name: 'Umesh Rathore',
    email: 'umesh-singh.rathore@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Ramp & Aircraft Services',
    title: 'Senior Duty Manager'
  },
  {
    id: 'u-saks',
    uNumber: 'SAKS',
    name: 'Saksham Pasricha',
    email: 'saksham.pasricha@swiss.com',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Swiss Ground Operations',
    title: 'Station Liaison Lead'
  },
  {
    id: 'u-194283',
    uNumber: 'U194283',
    name: 'RAKESH PARMAR',
    email: 'rakesh.kumar.sp@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Ground Handling Support',
    title: 'Senior Ground Lead'
  },
  {
    id: 'u-194317',
    uNumber: 'U194317',
    name: 'JASPREET MALIK',
    email: 'jaspreet.malik.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Passenger Services',
    title: 'Team Lead'
  },
  {
    id: 'u-137790',
    uNumber: 'U137790',
    name: 'DANISH MANZOOR',
    email: 'danish.manzoor.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Station Control',
    title: 'Duty Supervisor'
  },
  {
    id: 'u-128206',
    uNumber: 'U128206',
    name: 'ADITI BHALLA',
    email: 'u128206@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Passenger Services',
    title: 'Service Lead'
  },
  {
    id: 'u-148038',
    uNumber: 'U148038',
    name: 'PRIYANKA JAIN',
    email: 'priyanka.jain.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Ticketing & Redcap',
    title: 'Customer Service Lead'
  },
  {
    id: 'u-177834',
    uNumber: 'U177834',
    name: 'CHRISTY',
    email: 'christy.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Lounge & VIP',
    title: 'Premium Services Lead'
  },
  {
    id: 'u-155961',
    uNumber: 'U155961',
    name: 'SUDIP KUMAR SUTRADHAR',
    email: 'u155961@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Ramp Services',
    title: 'Operations Agent'
  },
  {
    id: 'u-102164',
    uNumber: 'U102164',
    name: 'DAVINDER SINGH',
    email: 'u102164@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Baggage Services',
    title: 'Baggage Officer'
  },
  {
    id: 'u-102841',
    uNumber: 'U102841',
    name: 'PAWANPREET',
    email: 'u102841@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Gate Services',
    title: 'Gate Agent'
  },
  {
    id: 'u-108395',
    uNumber: 'U108395',
    name: 'ASIT DAS',
    email: 'u108395@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Customer Care',
    title: 'Service Agent'
  },
  {
    id: 'u-148030',
    uNumber: 'U148030',
    name: 'SIMARPREET KAUR',
    email: 'u148030@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Flight Dispatch',
    title: 'Dispatch Lead'
  },
  {
    id: 'u-151236',
    uNumber: 'U151236',
    name: 'ARUN SINGH',
    email: 'arun.singh.sp@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Aviation Safety',
    title: 'Safety Lead'
  },
  {
    id: 'u-152267',
    uNumber: 'U152267',
    name: 'VAIBHAV',
    email: 'u152267@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Turnaround Ops',
    title: 'Turnaround Coordinator'
  },
  {
    id: 'u-152261',
    uNumber: 'U152261',
    name: 'RONAK SINGH',
    email: 'ronak.singh.sp@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Security & Airside',
    title: 'Airside Lead'
  },
  {
    id: 'u-103735',
    uNumber: 'U103735',
    name: 'SUJATA BHARTI',
    email: 'u103735@lhgroup.de',
    isAls: true,
    isLead: false,
    isAdmin: false,
    department: 'Station Services',
    title: 'ALS Specialist'
  },
  {
    id: 'u-125316',
    uNumber: 'U125316',
    name: 'ABHAY TIWARI',
    email: 'u125316@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Station Control',
    title: 'Shift Lead'
  },
  {
    id: 'u-191790',
    uNumber: 'U191790',
    name: 'PAYAL',
    email: 'u191790@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Passenger Services',
    title: 'Ground Agent'
  },
  {
    id: 'u-177840',
    uNumber: 'U177840',
    name: 'BHAGWATI BISWAKARMA',
    email: 'u177840@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Ticketing & Transit',
    title: 'Transit Agent'
  },
  {
    id: 'u-115377',
    uNumber: 'U115377',
    name: 'VINAY RAWAT',
    email: 'u115377@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Operations',
    title: 'Lead Supervisor'
  },
  {
    id: 'u-193961',
    uNumber: 'U193961',
    name: 'SIDHI SHARMA',
    email: 'u193961@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Passenger Care',
    title: 'Customer Executive'
  },
  {
    id: 'u-193964',
    uNumber: 'U193964',
    name: 'PREETI',
    email: 'u193964@lhgroup.de',
    isAls: true,
    isLead: false,
    isAdmin: false,
    department: 'ALS Handling',
    title: 'ALS Executive'
  },
  {
    id: 'u-193966',
    uNumber: 'U193966',
    name: 'ANKITA DUTTA',
    email: 'ankita.dutta.sp@dlh.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Station Training',
    title: 'Training Lead'
  },
  {
    id: 'u-193967',
    uNumber: 'U193967',
    name: 'SHIVANGI',
    email: 'u193967@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Customer Service',
    title: 'Passenger Associate'
  },
  {
    id: 'u-115468',
    uNumber: 'U115468',
    name: 'RHONIT PHILLIPS',
    email: 'rhonit.phillips.sp@dlh.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Station Services',
    title: 'Operations Associate'
  },
  {
    id: 'u-115470',
    uNumber: 'U115470',
    name: 'KHUSHI',
    email: 'u115470@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Front Desk',
    title: 'Service Agent'
  },
  {
    id: 'u-119170',
    uNumber: 'U119170',
    name: 'MAYANK AGGARWAL',
    email: 'u119170@lhgroup.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Operations',
    title: 'ALS Operations Lead'
  },
  {
    id: 'u-148697',
    uNumber: 'U148697',
    name: 'ISHA MANSURI',
    email: 'u148697@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Ground Operations',
    title: 'Operations Lead'
  },
  {
    id: 'u-150984',
    uNumber: 'U150984',
    name: 'IPSHITA KAUR',
    email: 'u150984@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Customer Relations',
    title: 'Relations Lead'
  },
  {
    id: 'u-161306',
    uNumber: 'U161306',
    name: 'PARVEEN BALIYAN',
    email: 'u161306@lhgroup.de',
    isAls: true,
    isLead: true,
    isAdmin: false,
    department: 'Safety & Quality',
    title: 'Safety Lead'
  },
  {
    id: 'u-169709',
    uNumber: 'U169709',
    name: 'MALVIKA VYAS',
    email: 'u169709@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Passenger Services',
    title: 'Service Agent'
  },
  {
    id: 'u-184279',
    uNumber: 'U184279',
    name: 'YASIR BHAT',
    email: 'yasir.bhat.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Ground Handling',
    title: 'Duty Lead'
  },
  {
    id: 'u-124807',
    uNumber: 'U124807',
    name: 'AMIT KUMAR',
    email: 'u124807@lhgroup.de',
    isAls: true,
    isLead: false,
    isAdmin: false,
    department: 'ALS Support',
    title: 'ALS Officer'
  },
  {
    id: 'u-171676',
    uNumber: 'U171676',
    name: 'SIDDHARTH SEHGAL',
    email: 'u171676@lhgroup.de',
    isAls: true,
    isLead: false,
    isAdmin: false,
    department: 'ALS Operations',
    title: 'ALS Specialist'
  },
  {
    id: 'u-142564',
    uNumber: 'U142564',
    name: 'KASHISH BACHHAS',
    email: 'u142564@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false,
    department: 'Gate Services',
    title: 'Associate'
  },
  {
    id: 'u-142565',
    uNumber: 'U142565',
    name: 'SIMARJEET KAUR',
    email: 'u142565@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Ticketing & Boarding',
    title: 'Boarding Lead'
  },
  {
    id: 'u-143324',
    uNumber: 'U143324',
    name: 'KRITIKA SHARMA',
    email: 'u143324@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Customer Experience',
    title: 'Experience Lead'
  },
  {
    id: 'u-145815',
    uNumber: 'U145815',
    name: 'PRACHI KHANNA',
    email: 'u145815@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false,
    department: 'Station Services',
    title: 'Station Lead'
  },

  // Page 2
  {
    id: 'u-145816',
    uNumber: 'U145816',
    name: 'AASIF ALI',
    email: 'u145816@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-145823',
    uNumber: 'U145823',
    name: 'MANJEET KAUR',
    email: 'u145823@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-146675',
    uNumber: 'U146675',
    name: 'KANIKA MEHTA',
    email: 'u146675@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-149981',
    uNumber: 'U149981',
    name: 'ARKA JANA',
    email: 'u149981@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-149994',
    uNumber: 'U149994',
    name: 'SHUBHAM KESTWAL',
    email: 'u149994@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false
  },
  {
    id: 'u-154745',
    uNumber: 'U154745',
    name: 'SHIVAM KUMAR',
    email: 'shivam.kumar.sp@dlh.de',
    isAls: false,
    isLead: true,
    isAdmin: false
  },
  {
    id: 'u-154742',
    uNumber: 'U154742',
    name: 'AMIT JAIN',
    email: 'amit.jain.sp@dlh.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-129073',
    uNumber: 'U129073',
    name: 'KM PURNIMA MISHRA',
    email: 'u129073@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-129095',
    uNumber: 'U129095',
    name: 'MANSI',
    email: 'u129095@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-129100',
    uNumber: 'U129100',
    name: 'HIMANSHI SHARMA',
    email: 'u129100@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-129104',
    uNumber: 'U129104',
    name: 'NEHA',
    email: 'u129104@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-152823',
    uNumber: 'U152823',
    name: 'AYUSH MEHRA',
    email: 'u152823@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-187132',
    uNumber: 'U187132',
    name: 'MITHLESH KUMAR',
    email: 'u187132@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-118786',
    uNumber: 'U118786',
    name: 'KOMAL KUMAWAT',
    email: 'u118786@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-133036',
    uNumber: 'U133036',
    name: 'VINAY SINGH',
    email: 'u133036@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-133041',
    uNumber: 'U133041',
    name: 'BHAVIKA TOSHAWAR',
    email: 'u133041@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-144450',
    uNumber: 'U144450',
    name: 'MAYANK CHAUHAN',
    email: 'u144450@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-144451',
    uNumber: 'U144451',
    name: 'ANSHIKA CHAURASIYA',
    email: 'u144451@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-144453',
    uNumber: 'U144453',
    name: 'SHRISHTI',
    email: 'u144453@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-144454',
    uNumber: 'U144454',
    name: 'SERINA NAOREM',
    email: 'u144454@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-144455',
    uNumber: 'U144455',
    name: 'SUDHANSHU MISHRA',
    email: 'u144455@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-145414',
    uNumber: 'U145414',
    name: 'SHIVKANT SHARMA',
    email: 'u145414@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-145416',
    uNumber: 'U145416',
    name: 'PRATHA VERMA',
    email: 'u145416@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-112895',
    uNumber: 'U112895',
    name: 'SHREYA DOBHAL',
    email: 'u112895@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-112912',
    uNumber: 'U112912',
    name: 'RAHISHA NEGI',
    email: 'u112912@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-146671',
    uNumber: 'U146671',
    name: 'KAJAL',
    email: 'u146671@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-123723',
    uNumber: 'U123723',
    name: 'NIVEDITA CHAUDHARY',
    email: 'u123723@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-124331',
    uNumber: 'U124331',
    name: 'RAJ KAUR',
    email: 'u124331@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-124397',
    uNumber: 'U124397',
    name: 'KSHITIJ BHAMBRA',
    email: 'u124397@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-129174',
    uNumber: 'U129174',
    name: 'CHETNA',
    email: 'u129174@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-124440',
    uNumber: 'U124440',
    name: 'NIKHIL KAPOOR',
    email: 'u124440@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-148248',
    uNumber: 'U148248',
    name: 'SHIVRAJ GHANSELA',
    email: 'u148248@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-125275',
    uNumber: 'U125275',
    name: 'TRISHA RAUTELA',
    email: 'u125275@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-100227',
    uNumber: 'U100227',
    name: 'PRAVEEN KUMAR PANDEY',
    email: 'u100227@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-131963',
    uNumber: 'U131963',
    name: 'NEHA VERMA',
    email: 'u131963@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-128309',
    uNumber: 'U128309',
    name: 'KANCHAN',
    email: 'u128309@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-128419',
    uNumber: 'U128419',
    name: 'ARYAN RAJPUT',
    email: 'u128419@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-133253',
    uNumber: 'U133253',
    name: 'PREM KISHAN',
    email: 'u133253@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-100017',
    uNumber: 'U100017',
    name: 'WANGKHEIMAYUM MANGALLEMBI',
    email: 'u100017@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101497',
    uNumber: 'U101497',
    name: 'AISHWARYA BHARDWAJ',
    email: 'u101497@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-126887',
    uNumber: 'U126887',
    name: 'ANANYA SINGH VARDHAN',
    email: 'u126887@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-126967',
    uNumber: 'U126967',
    name: 'BIKASH HAZARIKA',
    email: 'u126967@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-127361',
    uNumber: 'U127361',
    name: 'PRAYOJAN THAPA',
    email: 'u127361@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },

  // Page 3
  {
    id: 'u-127622',
    uNumber: 'U127622',
    name: 'KHUSHNUMA KHAN',
    email: 'u127622@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-100553',
    uNumber: 'U100553',
    name: 'PRITIMA KUMARI',
    email: 'u100553@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101569',
    uNumber: 'U101569',
    name: 'RITIKA',
    email: 'u101569@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101572',
    uNumber: 'U101572',
    name: 'TWYLA ALEXANDER',
    email: 'u101572@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-103833',
    uNumber: 'U103833',
    name: 'TARANPREET KAUR',
    email: 'u103833@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-104101',
    uNumber: 'U104101',
    name: 'KAVITA RAWAT',
    email: 'u104101@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-104288',
    uNumber: 'U104288',
    name: 'VANSHIKA LODHI',
    email: 'u104288@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-105660',
    uNumber: 'U105660',
    name: 'PAYAL SARKAR',
    email: 'u105660@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-106730',
    uNumber: 'U106730',
    name: 'AMANSHIKA',
    email: 'u106730@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-141965',
    uNumber: 'U141965',
    name: 'SHUDIT MEHTA',
    email: 'u141965@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-102140',
    uNumber: 'U102140',
    name: 'VIKASH SHARMA',
    email: 'u102140@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142838',
    uNumber: 'U142838',
    name: 'DIVYANSHI MANI TIWARI',
    email: 'u142838@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142013',
    uNumber: 'U142013',
    name: 'SHUBH UPPAL',
    email: 'u142013@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142148',
    uNumber: 'U142148',
    name: 'AKANSHA',
    email: 'u142148@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142149',
    uNumber: 'U142149',
    name: 'BEENITA NEGI',
    email: 'u142149@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142649',
    uNumber: 'U142649',
    name: 'SONA GAURI',
    email: 'u142649@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-142827',
    uNumber: 'U142827',
    name: 'HONGSALEMBA',
    email: 'u142827@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-146550',
    uNumber: 'U146550',
    name: 'DIVYA',
    email: 'u146550@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101573',
    uNumber: 'U101573',
    name: 'DAMANPREET',
    email: 'u101573@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-127371',
    uNumber: 'U127371',
    name: 'GUNJAN',
    email: 'u127371@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-127506',
    uNumber: 'U127506',
    name: 'ANCHAL',
    email: 'u127506@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-133122',
    uNumber: 'U133122',
    name: 'ANSHIKA CHOUDHARY',
    email: 'u133122@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-135602',
    uNumber: 'U135602',
    name: 'JYOTI',
    email: 'u135602@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-145990',
    uNumber: 'U145990',
    name: 'MUSKAN',
    email: 'u145990@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-148146',
    uNumber: 'U148146',
    name: 'KARAN NATHANI',
    email: 'u148146@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-148148',
    uNumber: 'U148148',
    name: 'BHUMIKA SINGH',
    email: 'u148148@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101125',
    uNumber: 'U101125',
    name: 'AYUSH PRATAP SINGH',
    email: 'u101125@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-101398',
    uNumber: 'U101398',
    name: 'BINA CHETRY',
    email: 'u101398@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-102363',
    uNumber: 'U102363',
    name: 'ARMAAN KHAN',
    email: 'u102363@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-102686',
    uNumber: 'U102686',
    name: 'GULSHAN',
    email: 'u102686@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-151124',
    uNumber: 'U151124',
    name: 'NISHA YADAV',
    email: 'u151124@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-147597',
    uNumber: 'U147597',
    name: 'SHIVAM SHARMA',
    email: 'u147597@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-152790',
    uNumber: 'U152790',
    name: 'ADITYA JHA',
    email: 'u152790@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-153070',
    uNumber: 'U153070',
    name: 'AKSHATA NAGANURE',
    email: 'u153070@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-153071',
    uNumber: 'U153071',
    name: 'VIJAYLAXMI MODANWAL',
    email: 'u153071@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-154161',
    uNumber: 'U154161',
    name: 'VISHAL',
    email: 'u154161@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-154157',
    uNumber: 'U154157',
    name: 'TARANDEEP KAUR',
    email: 'u154157@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-154158',
    uNumber: 'U154158',
    name: 'SILPA WAIKHOM',
    email: 'u154158@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-148685',
    uNumber: 'U148685',
    name: 'ANKIT MISHRA',
    email: 'ankit.mishra.sp@dlh.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-141960',
    uNumber: 'U141960',
    name: 'HARPREET SINGH',
    email: 'u141960@lhgroup.de',
    isAls: false,
    isLead: true,
    isAdmin: false
  },

  // Page 4
  {
    id: 'u-146554',
    uNumber: 'U146554',
    name: 'MAYANK BANGARI',
    email: 'u146554@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-146557',
    uNumber: 'U146557',
    name: 'SHUBHAM PRASAD',
    email: 'u146557@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-149989',
    uNumber: 'U149989',
    name: 'VARUN SHARMA',
    email: 'u149989@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-153892',
    uNumber: 'U153892',
    name: 'MUSKAN ARORA',
    email: 'u153892@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-153884',
    uNumber: 'U153884',
    name: 'PIRTPAL KAUR',
    email: 'u153884@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  },
  {
    id: 'u-153880',
    uNumber: 'U153880',
    name: 'SHORYA SINGH',
    email: 'u153880@lhgroup.de',
    isAls: false,
    isLead: false,
    isAdmin: false
  }
];
