'use strict';

const { CATEGORIES } = require('./categories');

// Category keys -> official category names (index into CATEGORIES)
const C = {
  IT: CATEGORIES[0], BUS: CATEGORIES[1], FIN: CATEGORIES[2], MKT: CATEGORIES[3], HEA: CATEGORIES[4],
  EDU: CATEGORIES[5], ENG: CATEGORIES[6], DES: CATEGORIES[7], LEG: CATEGORIES[8], MAN: CATEGORIES[9],
  LOG: CATEGORIES[10], HOS: CATEGORIES[11], HR: CATEGORIES[12], CS: CATEGORIES[13], AGR: CATEGORIES[14],
  GOV: CATEGORIES[15], SCI: CATEGORIES[16], GAM: CATEGORIES[17], SPO: CATEGORIES[18]
};

// [canonical name, [aliases], [categories]]
// The dictionary is the transparent, editable knowledge base used by the keyword matcher.
const SKILL_DEFS = [
  // IT & software
  ['Python', ['python', 'python3'], ['IT', 'SCI']],
  ['Java', ['java', 'core java', 'java se', 'j2ee'], ['IT']],
  ['JavaScript', ['javascript', 'ecmascript', 'es6', 'js'], ['IT']],
  ['TypeScript', ['typescript'], ['IT']],
  ['C++', ['c++', 'cpp'], ['IT', 'GAM']],
  ['C#', ['c#', 'c sharp', 'csharp'], ['IT', 'GAM']],
  ['.NET', ['.net', 'dotnet', 'asp.net', '.net core'], ['IT']],
  ['PHP', ['php', 'laravel'], ['IT']],
  ['Go', ['golang', 'go lang', 'go language'], ['IT']],
  ['Rust', ['rust'], ['IT']],
  ['Kotlin', ['kotlin'], ['IT']],
  ['Swift', ['swift', 'swiftui'], ['IT']],
  ['Ruby', ['ruby', 'ruby on rails', 'rails'], ['IT']],
  ['R', ['r programming', 'r language', 'rstudio'], ['SCI', 'IT']],
  ['HTML', ['html', 'html5'], ['IT', 'DES']],
  ['CSS', ['css', 'css3', 'sass', 'scss'], ['IT', 'DES']],
  ['React', ['react', 'react.js', 'reactjs', 'react js'], ['IT']],
  ['Angular', ['angular', 'angularjs'], ['IT']],
  ['Vue.js', ['vue', 'vue.js', 'vuejs'], ['IT']],
  ['Node.js', ['node', 'node.js', 'nodejs', 'express.js', 'expressjs'], ['IT']],
  ['Django', ['django'], ['IT']],
  ['Flask', ['flask'], ['IT']],
  ['Spring Boot', ['spring boot', 'spring framework'], ['IT']],
  ['REST APIs', ['rest api', 'rest apis', 'restful', 'restful api', 'restful apis', 'api development', 'api integration', 'apis'], ['IT']],
  ['GraphQL', ['graphql'], ['IT']],
  ['SQL', ['sql', 'structured query language', 't-sql', 'pl/sql', 'plsql'], ['IT', 'SCI', 'FIN']],
  ['MySQL', ['mysql'], ['IT']],
  ['PostgreSQL', ['postgresql', 'postgres'], ['IT']],
  ['MongoDB', ['mongodb', 'mongo db'], ['IT']],
  ['SQLite', ['sqlite'], ['IT']],
  ['Oracle Database', ['oracle db', 'oracle database', 'oracle dba'], ['IT']],
  ['SQL Server', ['sql server', 'mssql', 'ms sql'], ['IT']],
  ['Redis', ['redis'], ['IT']],
  ['Database Administration', ['database administration', 'dba', 'database management', 'database maintenance', 'database administrator'], ['IT']],
  ['Backup and Recovery', ['backup and recovery', 'disaster recovery', 'database backup'], ['IT']],
  ['Performance Tuning', ['performance tuning', 'query optimization', 'query optimisation', 'database optimization', 'database optimisation'], ['IT']],
  ['Data Modeling', ['data modeling', 'data modelling', 'erd', 'schema design'], ['IT']],
  ['Git', ['git', 'github', 'gitlab', 'bitbucket'], ['IT']],
  ['Docker', ['docker', 'containers'], ['IT']],
  ['Kubernetes', ['kubernetes', 'k8s'], ['IT']],
  ['AWS', ['aws', 'amazon web services', 'ec2', 's3'], ['IT']],
  ['Azure', ['azure', 'microsoft azure'], ['IT']],
  ['Google Cloud', ['gcp', 'google cloud'], ['IT']],
  ['Linux', ['linux', 'unix', 'bash', 'shell scripting'], ['IT']],
  ['CI/CD', ['ci/cd', 'cicd', 'jenkins', 'github actions', 'continuous integration'], ['IT']],
  ['DevOps', ['devops'], ['IT']],
  ['Cyber Security', ['cyber security', 'cybersecurity', 'information security', 'network security', 'penetration testing'], ['IT']],
  ['Networking', ['networking', 'tcp/ip', 'cisco', 'ccna'], ['IT', 'ENG']],
  ['Software Testing', ['software testing', 'manual testing', 'test cases', 'quality assurance', 'qa', 'selenium', 'automation testing', 'unit testing', 'junit', 'pytest'], ['IT']],
  ['Agile', ['agile', 'scrum', 'kanban'], ['IT', 'BUS']],
  ['Android Development', ['android', 'android development', 'android studio'], ['IT']],
  ['iOS Development', ['ios', 'ios development'], ['IT']],
  ['Flutter', ['flutter', 'dart'], ['IT']],
  ['React Native', ['react native'], ['IT']],
  ['Machine Learning', ['machine learning', 'ml', 'scikit-learn', 'sklearn'], ['IT', 'SCI']],
  ['Deep Learning', ['deep learning', 'tensorflow', 'pytorch', 'keras', 'neural networks'], ['IT', 'SCI']],
  ['Natural Language Processing', ['nlp', 'natural language processing'], ['IT', 'SCI']],
  ['Data Analysis', ['data analysis', 'data analytics', 'data analyst', 'exploratory data analysis'], ['IT', 'SCI', 'BUS', 'FIN']],
  ['Data Science', ['data science', 'data scientist'], ['IT', 'SCI']],
  ['Pandas', ['pandas', 'numpy'], ['IT', 'SCI']],
  ['Power BI', ['power bi', 'powerbi'], ['IT', 'BUS', 'FIN']],
  ['Tableau', ['tableau'], ['IT', 'BUS']],
  ['ETL', ['etl', 'data pipeline', 'data pipelines', 'data warehouse', 'data warehousing'], ['IT']],
  ['Excel', ['excel', 'microsoft excel', 'ms excel', 'advanced excel', 'pivot table', 'pivot tables', 'vlookup'], ['FIN', 'BUS', 'HR', 'CS']],
  ['Microservices', ['microservices', 'microservice'], ['IT']],
  ['System Design', ['system design', 'software architecture'], ['IT']],
  ['Backend Development', ['backend development', 'back-end development', 'backend', 'server-side'], ['IT']],
  ['Frontend Development', ['frontend development', 'front-end development', 'frontend', 'front end'], ['IT']],
  ['Full Stack Development', ['full stack', 'full-stack', 'fullstack'], ['IT']],
  ['Web Development', ['web development', 'web developer', 'web application', 'web applications'], ['IT']],
  ['Mobile App Development', ['mobile app development', 'mobile application development', 'mobile apps'], ['IT']],
  ['Product Management', ['product management', 'product manager', 'product roadmap', 'product planning'], ['BUS', 'IT']],
  // Design & creative
  ['UI Design', ['ui design', 'user interface', 'user interface design', 'ui designer'], ['DES', 'IT']],
  ['UX Design', ['ux design', 'user experience', 'ux research', 'ux designer', 'usability', 'usability testing', 'user research'], ['DES', 'IT']],
  ['Figma', ['figma'], ['DES']],
  ['Adobe XD', ['adobe xd', 'xd'], ['DES']],
  ['Sketch', ['sketch app'], ['DES']],
  ['Wireframing', ['wireframing', 'wireframes', 'wireframe', 'prototyping', 'prototype', 'prototypes'], ['DES']],
  ['Design Systems', ['design system', 'design systems'], ['DES']],
  ['Photoshop', ['photoshop', 'adobe photoshop'], ['DES', 'MKT']],
  ['Illustrator', ['illustrator', 'adobe illustrator'], ['DES']],
  ['Graphic Design', ['graphic design', 'graphic designer', 'canva', 'corel draw', 'coreldraw'], ['DES', 'MKT']],
  ['Video Editing', ['video editing', 'premiere pro', 'after effects', 'final cut'], ['DES', 'GAM', 'MKT']],
  ['Motion Graphics', ['motion graphics', 'animation', '2d animation', '3d animation', 'blender'], ['DES', 'GAM']],
  ['Typography', ['typography'], ['DES']],
  ['Responsive Design', ['responsive design', 'responsive web design', 'mobile-first'], ['DES', 'IT']],
  // Marketing & sales
  ['SEO', ['seo', 'search engine optimization', 'search engine optimisation', 'on-page seo', 'off-page seo'], ['MKT']],
  ['Search Engine Marketing', ['google ads', 'adwords', 'ppc', 'pay per click'], ['MKT']],
  ['Social Media Marketing', ['social media marketing', 'social media', 'smm', 'instagram marketing', 'facebook ads', 'meta ads'], ['MKT']],
  ['Content Marketing', ['content marketing', 'content strategy', 'content writing', 'copywriting', 'blogging'], ['MKT']],
  ['Digital Marketing', ['digital marketing', 'online marketing'], ['MKT']],
  ['Email Marketing', ['email marketing', 'mailchimp', 'newsletter'], ['MKT']],
  ['Google Analytics', ['google analytics', 'ga4', 'web analytics'], ['MKT', 'IT']],
  ['Brand Management', ['brand management', 'branding', 'brand strategy'], ['MKT', 'BUS']],
  ['Market Research', ['market research', 'market analysis', 'competitor analysis'], ['MKT', 'BUS']],
  ['Lead Generation', ['lead generation', 'lead gen'], ['MKT']],
  ['Sales', ['sales', 'business development', 'b2b sales', 'inside sales', 'cold calling', 'sales strategy'], ['MKT', 'BUS']],
  ['CRM', ['crm', 'salesforce', 'hubspot', 'zoho crm'], ['MKT', 'CS', 'BUS']],
  ['Public Relations', ['public relations'], ['MKT']],
  // Business
  ['Project Management', ['project management', 'project manager', 'pmp', 'project planning', 'jira'], ['BUS', 'IT', 'ENG']],
  ['Business Analysis', ['business analysis', 'business analyst', 'requirements gathering', 'requirement analysis', 'brd'], ['BUS', 'IT']],
  ['Operations Management', ['operations management', 'operations', 'process improvement', 'lean', 'six sigma'], ['BUS', 'MAN']],
  ['Strategic Planning', ['strategic planning', 'strategy', 'business strategy'], ['BUS']],
  ['Stakeholder Management', ['stakeholder management', 'stakeholder engagement', 'client management'], ['BUS']],
  ['Team Leadership', ['team leadership', 'team management', 'people management', 'leadership'], ['BUS', 'HR']],
  ['Entrepreneurship', ['entrepreneurship', 'startup'], ['BUS']],
  ['Consulting', ['consulting', 'consultant', 'advisory'], ['BUS']],
  // Finance
  ['Accounting', ['accounting', 'bookkeeping', 'book keeping', 'accounts payable', 'accounts receivable', 'general ledger'], ['FIN']],
  ['Tally', ['tally', 'tally erp', 'tally prime'], ['FIN']],
  ['GST', ['gst', 'taxation', 'income tax', 'tds', 'tax filing'], ['FIN']],
  ['Financial Analysis', ['financial analysis', 'financial modeling', 'financial modelling', 'budgeting', 'forecasting', 'valuation'], ['FIN']],
  ['Auditing', ['auditing', 'audit', 'internal audit', 'statutory audit'], ['FIN']],
  ['SAP', ['sap', 'sap fico', 'sap erp'], ['FIN', 'IT', 'LOG']],
  ['QuickBooks', ['quickbooks', 'quick books'], ['FIN']],
  ['Payroll', ['payroll', 'payroll processing'], ['FIN', 'HR']],
  ['Investment Analysis', ['investment analysis', 'equity research', 'portfolio management', 'risk management'], ['FIN']],
  // HR
  ['Recruitment', ['recruitment', 'talent acquisition', 'recruiting', 'hiring', 'recruiter', 'end-to-end recruitment'], ['HR']],
  ['Candidate Sourcing', ['candidate sourcing', 'sourcing', 'boolean search', 'headhunting', 'naukri', 'linkedin recruiter'], ['HR']],
  ['Resume Screening', ['resume screening', 'cv screening', 'screening', 'shortlisting'], ['HR']],
  ['Interview Coordination', ['interview coordination', 'interview scheduling', 'scheduling interviews'], ['HR']],
  ['HR Operations', ['hr operations', 'hr administration', 'hr generalist', 'hris', 'hr management'], ['HR']],
  ['Employee Onboarding', ['onboarding', 'employee onboarding', 'induction', 'employee documentation'], ['HR']],
  ['Employee Engagement', ['employee engagement', 'employee relations', 'performance management'], ['HR']],
  ['Learning and Development', ['learning and development', 'l&d', 'training and development', 'corporate training'], ['HR', 'EDU']],
  ['Labour Law Compliance', ['labour law', 'labor law', 'statutory compliance'], ['HR', 'LEG']],
  // Customer support
  ['Customer Service', ['customer service', 'customer support', 'customer care', 'client support', 'customer success'], ['CS']],
  ['Technical Support', ['technical support', 'tech support', 'helpdesk', 'help desk', 'it support', 'troubleshooting'], ['CS', 'IT']],
  ['Zendesk', ['zendesk', 'freshdesk', 'ticketing', 'service desk'], ['CS']],
  ['Voice Process', ['voice process', 'call center', 'call centre', 'bpo', 'inbound calls', 'outbound calls'], ['CS']],
  ['Chat Support', ['chat support', 'email support', 'live chat'], ['CS']],
  ['Communication Skills', ['communication skills', 'verbal communication', 'written communication', 'communication'], ['CS', 'BUS', 'EDU', 'HR', 'HOS']],
  // Healthcare
  ['Patient Care', ['patient care', 'nursing', 'clinical', 'clinical care', 'first aid'], ['HEA']],
  ['Medical Coding', ['medical coding', 'icd-10', 'cpt', 'medical billing'], ['HEA']],
  ['Pharmacy', ['pharmacy', 'pharmacology', 'pharmaceutical'], ['HEA', 'SCI']],
  ['Healthcare Administration', ['healthcare administration', 'hospital administration', 'medical records', 'emr', 'ehr'], ['HEA']],
  ['Public Health', ['public health', 'epidemiology', 'health education'], ['HEA', 'GOV']],
  // Education
  ['Teaching', ['teaching', 'lesson planning', 'classroom management', 'curriculum', 'curriculum development', 'tutoring', 'instruction'], ['EDU']],
  ['Instructional Design', ['instructional design', 'e-learning', 'elearning', 'lms'], ['EDU', 'DES']],
  ['Training Delivery', ['training delivery', 'facilitation', 'workshop facilitation', 'corporate trainer'], ['EDU', 'HR']],
  // Engineering
  ['AutoCAD', ['autocad', 'cad', 'solidworks', 'catia', 'creo'], ['ENG', 'MAN']],
  ['Mechanical Engineering', ['mechanical engineering', 'thermodynamics', 'hvac'], ['ENG', 'MAN']],
  ['Electrical Engineering', ['electrical engineering', 'power systems', 'plc', 'scada', 'circuit design'], ['ENG']],
  ['Civil Engineering', ['civil engineering', 'structural analysis', 'staad', 'etabs', 'site supervision', 'construction management', 'estimation and costing'], ['ENG']],
  ['Embedded Systems', ['embedded systems', 'embedded c', 'microcontrollers', 'arduino', 'raspberry pi', 'iot'], ['ENG', 'IT']],
  ['MATLAB', ['matlab', 'simulink'], ['ENG', 'SCI']],
  // Legal
  ['Legal Research', ['legal research', 'legal drafting', 'drafting', 'contract drafting', 'contract management', 'litigation'], ['LEG']],
  ['Corporate Law', ['corporate law', 'company law', 'compliance', 'regulatory compliance', 'intellectual property', 'data protection'], ['LEG', 'GOV']],
  // Manufacturing / logistics
  ['Quality Control', ['quality control', 'quality management', 'iso 9001', 'inspection'], ['MAN']],
  ['Production Planning', ['production planning', 'production management', 'lean manufacturing', 'assembly', 'cnc', 'machine operation'], ['MAN']],
  ['Inventory Management', ['inventory management', 'inventory control', 'stock management', 'warehouse management', 'warehousing'], ['LOG', 'MAN']],
  ['Supply Chain Management', ['supply chain', 'supply chain management', 'procurement', 'vendor management', 'purchasing', 'sourcing and procurement'], ['LOG']],
  ['Logistics', ['logistics', 'freight', 'transportation', 'fleet management', 'dispatch', 'last mile', 'shipping'], ['LOG']],
  ['Demand Planning', ['demand planning', 'demand forecasting', 'erp'], ['LOG']],
  // Hospitality
  ['Hospitality Management', ['hospitality management', 'front office', 'housekeeping', 'guest relations', 'hotel management', 'event management', 'food and beverage'], ['HOS']],
  ['Travel and Tourism', ['travel and tourism', 'tour operations', 'ticketing and reservations', 'travel planning', 'tour guide'], ['HOS']],
  // Agriculture, government, science
  ['Agronomy', ['agronomy', 'crop management', 'soil science', 'agricultural extension', 'horticulture', 'farm management'], ['AGR']],
  ['Environmental Management', ['environmental management', 'environmental impact assessment', 'eia', 'sustainability', 'waste management', 'water management', 'gis'], ['AGR', 'SCI']],
  ['Public Administration', ['public administration', 'public policy', 'policy analysis', 'governance', 'e-governance'], ['GOV']],
  ['Research Methodology', ['research methodology', 'literature review', 'scientific writing', 'academic writing', 'experimental design', 'research'], ['SCI', 'EDU']],
  ['Laboratory Techniques', ['laboratory techniques', 'pcr', 'chromatography', 'spectroscopy', 'lab techniques', 'microbiology', 'biotechnology'], ['SCI', 'HEA']],
  ['Statistics', ['statistics', 'statistical analysis', 'spss', 'hypothesis testing', 'regression analysis'], ['SCI', 'IT', 'FIN']],
  // Gaming & sports
  ['Game Development', ['game development', 'unity', 'unreal engine', 'game design', 'game programming'], ['GAM', 'IT']],
  ['Game Testing', ['game testing', 'playtesting', 'level design'], ['GAM']],
  ['Sports Coaching', ['sports coaching', 'coaching', 'athletic training', 'fitness training', 'personal training', 'strength and conditioning', 'sports management'], ['SPO']],
  ['Nutrition', ['nutrition', 'dietetics', 'diet planning', 'yoga', 'physiotherapy'], ['SPO', 'HEA']],
  // Soft skills (not category specific)
  ['Problem Solving', ['problem solving', 'problem-solving', 'analytical skills', 'critical thinking'], []],
  ['Teamwork', ['teamwork', 'team player', 'collaboration'], []],
  ['Time Management', ['time management', 'multitasking'], []],
  ['MS Office', ['ms office', 'microsoft office', 'ms word', 'powerpoint', 'ms powerpoint', 'google workspace'], []]
];

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }

const SKILLS = SKILL_DEFS.map(([name, aliases, cats]) => {
  const all = Array.from(new Set([name.toLowerCase(), ...aliases]));
  // longest alias first so multi-word aliases win
  all.sort((a, b) => b.length - a.length);
  const pattern = all.map(escapeRegex).join('|');
  return {
    name,
    aliases: all,
    categories: cats.map((k) => C[k]),
    regex: new RegExp(`(?<![a-z0-9+#.])(?:${pattern})(?![a-z0-9+#])`, 'i')
  };
});

const ALIAS_TO_SKILL = new Map();
SKILLS.forEach((s) => s.aliases.forEach((a) => ALIAS_TO_SKILL.set(a, s)));

function canonicalise(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return null;
  const hit = ALIAS_TO_SKILL.get(key);
  return hit ? hit.name : String(raw).trim();
}

/** Finds known skills inside free text. Returns canonical skill names. */
function extractSkills(text) {
  if (!text) return [];
  const found = [];
  for (const skill of SKILLS) {
    if (skill.regex.test(text)) found.push(skill.name);
  }
  return found;
}

function skillCategories(name) {
  const s = SKILLS.find((x) => x.name === name);
  return s ? s.categories : [];
}

module.exports = { SKILLS, extractSkills, canonicalise, skillCategories, C };
