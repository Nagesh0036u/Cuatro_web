'use strict';

/**
 * DEMONSTRATION RECORDS ONLY.
 * These are not real vacancies. They exist so the Careers page, filters and job matching can be
 * evaluated before real jobs are entered in the Admin Portal. Every record is stored with
 * is_demo = 1 and is labelled "Demonstration listing" on the public site.
 */
module.exports = [
  {
    title: 'Python Developer', category: 'Information Technology (IT) & Software', location: 'Bengaluru', employment_type: 'Full-time', work_mode: 'Hybrid',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 400000, salary_max: 800000,
    skills: 'Python, SQL, Data Analysis, Machine Learning, REST APIs, Git',
    short_description: 'Build and maintain Python services and data workflows for client projects.',
    description: 'Demonstration record. Work with the product team to build Python services, data processing scripts and REST APIs for client projects.',
    responsibilities: 'Develop and maintain Python applications\nWrite SQL queries and data analysis scripts\nIntegrate REST APIs\nTest and document code',
    qualifications: "Bachelor's degree in Computer Science, IT or a related field"
  },
  {
    title: 'Full Stack Web Developer', category: 'Information Technology (IT) & Software', location: 'Bengaluru', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: '3-5 years', experience_years_min: 3, salary_min: 700000, salary_max: 1400000,
    skills: 'JavaScript, React, Node.js, MongoDB, REST APIs, Git',
    short_description: 'Own features end to end across the React front end and Node.js back end.',
    description: 'Demonstration record. Design, build and deploy web applications using JavaScript, React and Node.js with a MongoDB database.',
    responsibilities: 'Build responsive user interfaces with React\nDevelop Node.js APIs\nModel data in MongoDB\nReview code and mentor junior developers',
    qualifications: "Bachelor's degree in Computer Science or equivalent practical experience"
  },
  {
    title: 'Database Administrator', category: 'Information Technology (IT) & Software', location: 'Hyderabad', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: '3-5 years', experience_years_min: 3, salary_min: 600000, salary_max: 1200000,
    skills: 'SQL, MySQL, PostgreSQL, Database Administration, Backup and Recovery, Performance Tuning',
    short_description: 'Monitor, secure and optimise client databases.',
    description: 'Demonstration record. Manage database environments, monitor performance, maintain backups and control access for client systems.',
    responsibilities: 'Monitor and maintain databases\nTune slow queries\nManage backups and recovery tests\nControl access and permissions',
    qualifications: "Bachelor's degree in Computer Science, IT or a related field"
  },
  {
    title: 'UI/UX Designer', category: 'Design & Creative Arts', location: 'Remote (India)', employment_type: 'Full-time', work_mode: 'Remote',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 400000, salary_max: 900000,
    skills: 'UI Design, UX Design, Figma, Wireframing, Design Systems, Responsive Design',
    short_description: 'Design clear, usable interfaces for web and mobile products.',
    description: 'Demonstration record. Create wireframes, prototypes and visual designs, and maintain a shared design system for web and mobile applications.',
    responsibilities: 'Create wireframes and interactive prototypes\nRun usability reviews\nMaintain the design system\nHand off designs to developers',
    qualifications: 'Degree or diploma in Design, HCI or a related field, or an equivalent portfolio'
  },
  {
    title: 'Digital Marketing Executive', category: 'Marketing & Sales', location: 'Bengaluru', employment_type: 'Full-time', work_mode: 'Hybrid',
    experience_level: 'Fresher / Entry level', experience_years_min: 0, salary_min: 250000, salary_max: 450000,
    skills: 'SEO, Social Media Marketing, Content Marketing, Google Analytics, Email Marketing',
    short_description: 'Plan and run SEO, social and content campaigns.',
    description: 'Demonstration record. Support client campaigns across search, social media and email, and report on performance using analytics tools.',
    responsibilities: 'Optimise website content for search\nSchedule and monitor social media posts\nPrepare monthly performance reports\nCoordinate content with designers',
    qualifications: "Bachelor's degree in Marketing, Mass Communication or a related field"
  },
  {
    title: 'HR Recruiter', category: 'Human Resources (HR)', location: 'Bengaluru', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 300000, salary_max: 550000,
    skills: 'Recruitment, Candidate Sourcing, Resume Screening, Interview Coordination, Communication Skills',
    short_description: 'Source, screen and coordinate candidates for client hiring needs.',
    description: 'Demonstration record. Handle end-to-end recruitment for client roles including sourcing, screening resumes and coordinating interviews.',
    responsibilities: 'Source candidates from job portals and networks\nScreen resumes against job requirements\nCoordinate interviews\nMaintain candidate records',
    qualifications: "Bachelor's degree in any discipline; MBA (HR) preferred"
  },
  {
    title: 'HR Operations Intern', category: 'Human Resources (HR)', location: 'Bengaluru', employment_type: 'Internship', work_mode: 'On-site',
    experience_level: 'Fresher / Entry level', experience_years_min: 0, salary_text: 'Stipend as per company policy',
    skills: 'HR Operations, Employee Onboarding, Excel, Communication Skills',
    short_description: 'Learn HR operations while supporting documentation and onboarding.',
    description: 'Demonstration record. Support the HR team with employee documentation, onboarding checklists and records maintenance.',
    responsibilities: 'Maintain employee documents\nSupport onboarding activities\nUpdate HR trackers in Excel',
    qualifications: "Pursuing or completed Bachelor's degree"
  },
  {
    title: 'Business Analyst', category: 'Business & Management', location: 'Mumbai', employment_type: 'Full-time', work_mode: 'Hybrid',
    experience_level: '3-5 years', experience_years_min: 3, salary_min: 800000, salary_max: 1500000,
    skills: 'Business Analysis, Data Analysis, SQL, Power BI, Stakeholder Management, Agile',
    short_description: 'Translate business needs into clear requirements and reports.',
    description: 'Demonstration record. Gather requirements, analyse data and present insights to stakeholders for technology and process projects.',
    responsibilities: 'Gather and document requirements\nAnalyse data with SQL and Power BI\nCommunicate with stakeholders\nSupport agile delivery teams',
    qualifications: "Bachelor's degree in Business, Engineering or a related field"
  },
  {
    title: 'Accounts Executive', category: 'Finance & Accounting', location: 'Pune', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 250000, salary_max: 450000,
    skills: 'Accounting, Tally, GST, Excel',
    short_description: 'Maintain books of accounts and handle GST filings.',
    description: 'Demonstration record. Record daily transactions, reconcile accounts and support GST and statutory filings.',
    responsibilities: 'Record daily accounting entries\nReconcile bank statements\nPrepare GST returns\nSupport month-end closing',
    qualifications: "Bachelor's degree in Commerce or Accounting"
  },
  {
    title: 'Customer Support Associate', category: 'Customer Support', location: 'Chennai', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: 'Fresher / Entry level', experience_years_min: 0, salary_min: 200000, salary_max: 350000,
    skills: 'Customer Service, Communication Skills, Technical Support, Zendesk',
    short_description: 'Help customers through chat, email and phone.',
    description: 'Demonstration record. Respond to customer queries, log tickets and escalate issues to the right teams.',
    responsibilities: 'Respond to customer queries\nLog and track tickets\nEscalate technical issues\nMaintain service quality standards',
    qualifications: 'Higher secondary or any graduate degree'
  },
  {
    title: 'Software Test Engineer', category: 'Information Technology (IT) & Software', location: 'Remote (India)', employment_type: 'Contract', work_mode: 'Remote',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 400000, salary_max: 800000,
    skills: 'Software Testing, Selenium, SQL, Agile, Git',
    short_description: 'Test web and mobile products and report defects.',
    description: 'Demonstration record. Create test cases, run manual and automated tests, and report defects for web and mobile products.',
    responsibilities: 'Write and execute test cases\nAutomate regression tests\nReport and track defects\nParticipate in sprint reviews',
    qualifications: "Bachelor's degree in Computer Science, IT or a related field"
  },
  {
    title: 'Logistics Coordinator', category: 'Logistics & Supply Chain', location: 'Chennai', employment_type: 'Full-time', work_mode: 'On-site',
    experience_level: '1-3 years', experience_years_min: 1, salary_min: 280000, salary_max: 480000,
    skills: 'Logistics, Inventory Management, Supply Chain Management, Excel',
    short_description: 'Coordinate shipments, vendors and inventory records.',
    description: 'Demonstration record. Track shipments, coordinate with vendors and maintain inventory records.',
    responsibilities: 'Track inbound and outbound shipments\nCoordinate with vendors\nMaintain inventory in Excel',
    qualifications: "Bachelor's degree in any discipline"
  },
  {
    title: 'Research Associate', category: 'Science & Research', location: 'Bengaluru', employment_type: 'Temporary', work_mode: 'On-site',
    experience_level: 'Fresher / Entry level', experience_years_min: 0, salary_min: 300000, salary_max: 500000,
    skills: 'Research Methodology, Statistics, Data Analysis, Python',
    short_description: 'Support research projects with data collection and analysis.',
    description: 'Demonstration record. Collect and analyse data, prepare literature reviews and support research reports.',
    responsibilities: 'Conduct literature reviews\nCollect and clean data\nRun statistical analysis\nDraft research summaries',
    qualifications: "Master's degree in a science or statistics discipline"
  },
  {
    title: 'Corporate Trainer', category: 'Education & Training', location: 'Hybrid (Bengaluru)', employment_type: 'Part-time', work_mode: 'Hybrid',
    experience_level: '3-5 years', experience_years_min: 3, salary_text: 'Per-session payment',
    skills: 'Training Delivery, Instructional Design, Communication Skills, Teaching',
    short_description: 'Deliver workshops on workplace and technical skills.',
    description: 'Demonstration record. Plan and deliver training sessions for working professionals and graduates.',
    responsibilities: 'Plan session content\nDeliver workshops\nCollect learner feedback',
    qualifications: "Bachelor's degree; training certification preferred"
  }
];
