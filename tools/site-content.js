'use strict';

// All public copy for the Cuatro Tech Solutions website lives here.
// Only information supplied by Cuatro is used: no invented clients, awards, testimonials or statistics.

const company = {
  name: 'Cuatro Tech Solutions',
  tagline: 'Empowering Growth Through People, Data & Digital Innovation.',
  website: 'www.cuatrotechsolutions.com',
  url: 'https://cuatrotechsolutions.com',
  email: 'hr@cuatrotechsolutions.com',
  phone1: '+91 9902720247',
  phone2: '+91 8792098197',
  tel1: '+919902720247',
  tel2: '+918792098197',
  intro: [
    'Cuatro Tech Solutions is a technology and business solutions company focused on helping organisations improve their operations and digital capabilities.',
    'We bring together people, technology, data and creative thinking to deliver practical solutions that support business growth.',
    'Our services include HR Services, Database Management, Digital Marketing, UI/UX Design and Product Development.',
    'We focus on understanding business requirements, developing suitable solutions and supporting clients throughout their journey.'
  ],
  mission: 'To empower organisations with intelligent technology and practical solutions that drive measurable growth and operational excellence.',
  vision: 'To become a trusted technology and digital transformation partner, helping businesses grow through innovation, quality and continuous improvement.',
  values: ['Integrity', 'Innovation', 'Collaboration', 'Customer commitment', 'Excellence', 'Continuous improvement'],
  whoWeAre: [
    'Cuatro Tech Solutions brings together expertise in people management, data management, digital marketing and technology development.',
    'We work to simplify business challenges through practical, scalable and carefully planned solutions.',
    'We believe every organisation has different requirements. Therefore, our approach focuses on understanding individual business needs rather than offering the same solution to everyone.'
  ]
};

const reasons = [
  { icon: 'icon-expertise-1', title: 'Expert Team', text: 'A dedicated team focused on understanding business requirements and delivering relevant services.' },
  { icon: 'icon-innovation-1', title: 'Innovative Solutions', text: 'We use modern technologies and practical approaches to solve business challenges.' },
  { icon: 'icon-solution-1', title: 'Customized Approach', text: "Solutions are planned around each client's objectives, requirements and available resources." },
  { icon: 'icon-quality-2', title: 'Affordable Pricing', text: 'We focus on transparent and value-oriented services that consider business requirements and budgets.' },
  { icon: 'icon-verified-2', title: 'Reliable Delivery', text: 'Our structured approach helps ensure organised implementation and timely communication.' },
  { icon: 'icon-customer-support-1', title: 'Dedicated Support', text: 'We provide assistance and continued support to help clients maintain and improve their operations.' }
];

const steps = [
  { title: 'Discover', text: 'Understand business goals and requirements.' },
  { title: 'Plan', text: 'Prepare the approach, roadmap and milestones.' },
  { title: 'Design', text: 'Develop the solution structure and user experience.' },
  { title: 'Develop', text: 'Build and improve the solution.' },
  { title: 'Deploy', text: 'Implement the solution and prepare it for use.' },
  { title: 'Support', text: 'Provide assistance and continuous improvements.' }
];

const services = [
  {
    slug: 'service-hr-services.html', title: 'HR Services', short: 'HR <br> Services', icon: 'icon-team-2',
    cardImg: 'service-1-4.png', heroImg: 'service-d-1-2.png',
    description: 'We provide HR solutions that help businesses manage their workforce, streamline recruitment and improve human resource operations.',
    message: 'We help businesses connect with suitable talent and manage HR processes more effectively.',
    offerings: ['Recruitment and Talent Acquisition', 'Candidate Sourcing and Screening', 'Resume Screening', 'Interview Coordination', 'HR Operations Support', 'Employee Documentation', 'Workforce Management Support', 'HR Process Assistance'],
    benefits: ['Access to a structured recruitment process', 'More organised HR records and documentation', 'Less administrative effort for your internal team'],
    benefitText: 'Our HR support is designed to keep hiring and day-to-day people processes organised and consistent.',
    faqs: [
      ['What HR support can Cuatro provide?', 'We support recruitment, candidate sourcing and screening, interview coordination, HR operations, employee documentation and workforce management processes.'],
      ['Can you help with only part of the hiring process?', 'Yes. Services such as resume screening or interview coordination can be requested individually. Contact us with your requirement and we will discuss the right scope.']
    ],
    why: [1, 4]
  },
  {
    slug: 'service-database-management.html', title: 'Database Management', short: 'Database <br> Management', icon: 'icon-analysis-1',
    cardImg: 'service-1-5.png', heroImg: 'service-d-1-1.png',
    description: 'We help businesses organise, maintain and manage their data through reliable database solutions.',
    message: 'We help businesses maintain organised, accessible and reliable data systems.',
    offerings: ['Database Management and Organisation', 'Database Monitoring and Maintenance', 'Database Security and Access Management', 'Backup and Recovery Support', 'Database Performance Optimisation'],
    benefits: ['Organised and accessible business data', 'Controlled access to sensitive information', 'Backup and recovery planning for continuity'],
    benefitText: 'Reliable data systems make it easier for teams to find information and keep operations running.',
    faqs: [
      ['What does database management include?', 'It includes organising and maintaining databases, monitoring them, managing security and access, supporting backup and recovery, and optimising performance.'],
      ['Can you work with our existing database?', 'We can review your current setup and discuss how it can be organised, maintained and improved. Contact us with details of your environment.']
    ],
    why: [2, 4]
  },
  {
    slug: 'service-digital-marketing.html', title: 'Digital Marketing', short: 'Digital <br> Marketing', icon: 'icon-digital-marketing-1',
    cardImg: 'service-1-3.png', heroImg: 'service-d-1-4.png',
    description: 'We help businesses strengthen their online presence, reach their target audience and improve their digital marketing activities.',
    message: 'We help businesses improve their online visibility and connect with their audience through digital marketing strategies.',
    offerings: ['Search Engine Optimisation (SEO)', 'Social Media Marketing', 'Digital Advertising', 'Content Marketing', 'Online Brand Visibility'],
    benefits: ['Improved visibility for your brand online', 'Marketing activity planned around your audience', 'Consistent content and campaign communication'],
    benefitText: 'We plan marketing activity around your objectives, audience and available budget.',
    faqs: [
      ['Which digital marketing services do you offer?', 'We offer search engine optimisation, social media marketing, digital advertising, content marketing and support to improve online brand visibility.'],
      ['How do we start?', 'Send us an enquiry describing your business and goals. We will discuss a suitable approach with you.']
    ],
    why: [2, 3]
  },
  {
    slug: 'service-ui-ux-design.html', title: 'UI/UX Design', short: 'UI/UX <br> Design', icon: 'icon-layer-1',
    cardImg: 'service-1-2.png', heroImg: 'service-d-1-2.png',
    description: 'We design user-friendly and visually engaging digital experiences that make websites and applications easier to understand and use.',
    message: 'We combine thoughtful design and usability to create digital experiences that are clear, attractive and easy to navigate.',
    offerings: ['Website UI Design', 'Mobile Application UI Design', 'User Experience Research', 'Wireframing and Prototyping', 'User Journey Mapping', 'Interactive Prototypes', 'Design Systems', 'Responsive Interface Design', 'Usability Improvements'],
    benefits: ['Interfaces that are clear and easy to use', 'Consistent design across web and mobile', 'Prototypes to review ideas before development'],
    benefitText: 'Good design reduces confusion for users and helps teams build with a shared visual language.',
    faqs: [
      ['What does UI/UX design cover?', 'It covers interface design for websites and mobile applications, user research, wireframes, prototypes, user journey mapping, design systems and usability improvements.'],
      ['Can you improve an existing website or app?', 'Yes. We can review usability and responsive behaviour and recommend improvements. Contact us with details.']
    ],
    why: [1, 2]
  },
  {
    slug: 'service-product-development.html', title: 'Product Development', short: 'Product <br> Development', icon: 'icon-software-1',
    cardImg: 'service-1-1.png', heroImg: 'service-d-1-3.png',
    description: 'We help businesses transform ideas into practical digital products through structured planning, design, development and improvement.',
    message: 'We help turn business ideas into functional digital products designed around real user and business requirements.',
    offerings: ['Product Idea Analysis', 'Product Planning', 'Web Application Development', 'Mobile Application Development', 'Frontend Development', 'Backend Development', 'API Integration', 'Database Integration', 'Testing and Quality Assurance', 'Product Maintenance and Improvements'],
    benefits: ['A structured path from idea to working product', 'Development, testing and maintenance in one place', 'Products shaped around real user needs'],
    benefitText: 'Structured planning, design and development helps keep delivery organised and communication timely.',
    faqs: [
      ['What kinds of products can you build?', 'We build web and mobile applications, including frontend, backend, API and database integration, with testing and quality assurance.'],
      ['Do you support products after launch?', 'Yes. Product maintenance and improvements are part of our service offering.']
    ],
    why: [4, 5]
  }
];

const faqs = [
  ['What does Cuatro Tech Solutions do?', 'We are a technology and business solutions company. Our services include HR Services, Database Management, Digital Marketing, UI/UX Design and Product Development.'],
  ['How can I enquire about a service?', 'Use the Contact page, email hr@cuatrotechsolutions.com, or call +91 9902720247 or +91 8792098197.'],
  ['How does Cuatro work with clients?', 'We follow six stages: Discover, Plan, Design, Develop, Deploy and Support. Each solution is planned around the individual needs of the client.'],
  ['How do I apply for a job at Cuatro?', 'Open Careers at Cuatro, choose a job and select Apply Now. You will be asked to create a Student Portal account, complete your profile and upload your resume before applying.'],
  ['How does the job matching work?', 'After you upload a resume, the portal extracts skills and keywords and compares them with each job\u2019s requirements. The match percentage is calculated from your actual profile and resume, and the portal shows matching skills and skills to improve.'],
  ['Can I track my application?', 'Yes. My Applications shows every application with its ID, current status, status history and any messages from the recruitment team. You also receive notifications in the portal.'],
  ['Is my resume kept private?', 'Resumes are stored privately and are not available through public links. They can only be opened by you and by authorised members of the Cuatro recruitment team.'],
  ['Are all listed jobs live vacancies?', 'Vacancies are published by the Cuatro recruitment team. Records labelled \u201CDemonstration listing\u201D are samples and are not live vacancies.']
];

module.exports = { company, reasons, steps, services, faqs };
