'use strict';

// The 19 official job categories. Do not rename, merge or remove.
const CATEGORIES = [
  'Information Technology (IT) & Software',
  'Business & Management',
  'Finance & Accounting',
  'Marketing & Sales',
  'Healthcare & Medical',
  'Education & Training',
  'Engineering',
  'Design & Creative Arts',
  'Legal',
  'Manufacturing & Production',
  'Logistics & Supply Chain',
  'Hospitality & Tourism',
  'Human Resources (HR)',
  'Customer Support',
  'Agriculture & Environment',
  'Government & Public Sector',
  'Science & Research',
  'Gaming & Entertainment',
  'Sports & Fitness'
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Temporary'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];
const EXPERIENCE_LEVELS = ['Fresher / Entry level', '1-3 years', '3-5 years', '5-8 years', '8+ years'];

// Application workflow. Order matters for the timeline.
const APPLICATION_STATUSES = [
  'Application Submitted',
  'Under Review',
  'Shortlisted',
  'Assessment Pending',
  'Interview Scheduled',
  'Interview Completed',
  'Selected',
  'Rejected',
  'Withdrawn'
];

const TERMINAL_STATUSES = ['Selected', 'Rejected', 'Withdrawn'];

module.exports = {
  CATEGORIES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  APPLICATION_STATUSES,
  TERMINAL_STATUSES
};
