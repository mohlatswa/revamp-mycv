/**
 * Skills taxonomy categorized for rural South African job market.
 */
const SKILLS_DATA = {
    'IT & Computers': [
        'Microsoft Word',
        'Microsoft Excel',
        'Email & Internet',
        'Data Capturing',
        'Social Media',
        'Basic Computer Skills',
        'Typing',
        'Point of Sale (POS) Systems',
        'Cellphone Repairs',
        'Printing & Copying'
    ],
    'Agriculture': [
        'Crop Farming',
        'Livestock Care',
        'Tractor Operation',
        'Irrigation Systems',
        'Harvesting',
        'Pesticide Application',
        'Fencing',
        'Animal Husbandry',
        'Poultry Farming',
        'Fruit Picking',
        'Soil Preparation',
        'Vegetable Gardening'
    ],
    'Construction': [
        'Bricklaying',
        'Plastering',
        'Painting',
        'Plumbing',
        'Electrical Wiring',
        'Carpentry',
        'Welding',
        'Tiling',
        'Roofing',
        'Concrete Mixing',
        'Scaffolding',
        'Site Cleanup'
    ],
    'Retail & Sales': [
        'Customer Service',
        'Cash Handling',
        'Stock Taking',
        'Merchandising',
        'Sales',
        'Shelf Packing',
        'Till Operation',
        'Product Knowledge',
        'Order Processing',
        'Store Cleaning'
    ],
    'Domestic Work': [
        'House Cleaning',
        'Laundry & Ironing',
        'Cooking',
        'Childcare',
        'Elder Care',
        'Gardening',
        'Pet Care',
        'Household Management',
        'Sewing & Mending'
    ],
    'Healthcare': [
        'First Aid',
        'Patient Care',
        'Home-Based Care',
        'HIV/AIDS Awareness',
        'Health Education',
        'Wound Care',
        'Vital Signs Monitoring',
        'Medication Administration',
        'Community Health Work',
        'Hygiene & Sanitation'
    ],
    'Transport & Driving': [
        'Code 8 Licence',
        'Code 10 Licence',
        'Code 14 Licence',
        'Forklift Operation',
        'Delivery Driving',
        'Route Planning',
        'Vehicle Maintenance',
        'Public Transport',
        'Defensive Driving',
        'Loading & Offloading'
    ],
    'Education & Training': [
        'Tutoring',
        'Classroom Assistance',
        'Early Childhood Development',
        'After-School Programs',
        'Adult Literacy',
        'Sports Coaching',
        'Mentoring',
        'Study Facilitation'
    ],
    'Administration': [
        'Filing & Record Keeping',
        'Reception & Front Desk',
        'Answering Phones',
        'Scheduling',
        'Minutes Taking',
        'Report Writing',
        'Office Management',
        'Data Entry',
        'Photocopying & Scanning'
    ],
    'General Skills': [
        'Teamwork',
        'Communication',
        'Time Management',
        'Problem Solving',
        'Physical Fitness',
        'Reliability',
        'Attention to Detail',
        'Multilingual',
        'Leadership',
        'Quick Learner',
        'Work Under Pressure',
        'Self-Motivated'
    ]
};

/**
 * Action verbs for achievement-based CV writing.
 * Used in Step 2 duties helper.
 */
const ACTION_VERBS = {
    general: ['Managed', 'Developed', 'Implemented', 'Achieved', 'Improved', 'Coordinated', 'Led', 'Created', 'Delivered', 'Organised', 'Trained', 'Supervised', 'Negotiated', 'Resolved', 'Maintained', 'Facilitated', 'Analysed', 'Planned', 'Prepared', 'Supported'],
    healthcare: ['Administered', 'Assessed', 'Monitored', 'Treated', 'Diagnosed', 'Counselled', 'Rehabilitated', 'Recorded', 'Provided care', 'Educated patients'],
    tech: ['Architected', 'Deployed', 'Automated', 'Optimized', 'Debugged', 'Configured', 'Integrated', 'Migrated', 'Programmed', 'Tested'],
    teaching: ['Taught', 'Mentored', 'Assessed', 'Designed curriculum', 'Facilitated', 'Guided', 'Evaluated', 'Coached', 'Inspired', 'Tutored'],
    engineering: ['Designed', 'Engineered', 'Fabricated', 'Inspected', 'Calculated', 'Tested', 'Commissioned', 'Installed', 'Calibrated', 'Constructed'],
    finance: ['Audited', 'Budgeted', 'Forecasted', 'Reconciled', 'Processed', 'Balanced', 'Reported', 'Invoiced', 'Allocated', 'Calculated'],
    legal: ['Drafted', 'Reviewed', 'Litigated', 'Advised', 'Negotiated', 'Researched', 'Filed', 'Represented', 'Interpreted', 'Mediated'],
    hospitality: ['Served', 'Greeted', 'Catered', 'Hosted', 'Coordinated events', 'Prepared meals', 'Managed bookings', 'Ensured satisfaction', 'Cleaned', 'Organised'],
    government: ['Administered', 'Regulated', 'Implemented policy', 'Reported', 'Audited', 'Coordinated', 'Monitored compliance', 'Facilitated', 'Processed', 'Evaluated'],
    trades: ['Installed', 'Repaired', 'Fabricated', 'Welded', 'Wired', 'Painted', 'Fitted', 'Maintained', 'Operated machinery', 'Inspected'],
    mining: ['Operated', 'Drilled', 'Blasted', 'Extracted', 'Inspected', 'Maintained equipment', 'Loaded', 'Transported', 'Monitored safety', 'Reported'],
    agriculture: ['Planted', 'Harvested', 'Irrigated', 'Operated tractors', 'Fed livestock', 'Maintained fencing', 'Applied pesticides', 'Sorted produce', 'Managed crops', 'Supervised workers'],
    retail: ['Sold', 'Processed transactions', 'Merchandised', 'Restocked', 'Served customers', 'Counted stock', 'Displayed products', 'Handled cash', 'Resolved complaints', 'Promoted'],
    'creative-design': ['Designed', 'Illustrated', 'Photographed', 'Edited', 'Produced', 'Branded', 'Conceptualised', 'Animated', 'Directed', 'Styled'],
    socialwork: ['Counselled', 'Advocated', 'Assessed needs', 'Connected resources', 'Facilitated groups', 'Supported families', 'Documented', 'Mediated', 'Empowered', 'Educated'],
    security: ['Patrolled', 'Monitored', 'Secured', 'Reported incidents', 'Controlled access', 'Investigated', 'Escorted', 'Detained', 'Responded to alarms', 'Documented'],
    logistics: ['Dispatched', 'Tracked', 'Loaded', 'Delivered', 'Routed', 'Scheduled', 'Warehoused', 'Inventoried', 'Coordinated shipments', 'Transported'],
    academic: ['Researched', 'Published', 'Lectured', 'Supervised students', 'Peer-reviewed', 'Presented findings', 'Authored', 'Collaborated', 'Analysed data', 'Secured funding'],
    consulting: ['Advised', 'Strategised', 'Analysed', 'Recommended', 'Transformed', 'Benchmarked', 'Facilitated workshops', 'Presented', 'Optimised', 'Scoped'],
    nonprofit: ['Fundraised', 'Volunteered', 'Mobilised', 'Organised campaigns', 'Grant-wrote', 'Partnered', 'Advocated', 'Distributed', 'Empowered', 'Monitored impact'],
    marketing: ['Launched campaigns', 'Created content', 'Managed social media', 'Analysed metrics', 'Grew audience', 'Branded', 'Pitched', 'Segmented', 'A/B tested', 'Partnered'],
    'data-science': ['Modelled', 'Analysed', 'Visualised', 'Predicted', 'Cleaned data', 'Queried', 'Built pipelines', 'Trained models', 'Automated reports', 'Mined data'],
    aviation: ['Piloted', 'Navigated', 'Pre-flighted', 'Communicated with ATC', 'Managed crew', 'Ensured safety', 'Logged hours', 'Trained pilots', 'Inspected aircraft', 'Operated'],
    media: ['Wrote', 'Edited', 'Produced', 'Interviewed', 'Broadcast', 'Reported', 'Published', 'Fact-checked', 'Presented', 'Curated'],
    banking: ['Processed transactions', 'Managed accounts', 'Assessed risk', 'Approved loans', 'Advised clients', 'Balanced tills', 'Opened accounts', 'Cross-sold', 'Audited', 'Reconciled'],
    'medical-doctor': ['Diagnosed', 'Treated', 'Prescribed', 'Operated', 'Consulted', 'Referred', 'Examined', 'Monitored', 'Discharged', 'Documented'],
    hr: ['Recruited', 'Onboarded', 'Managed performance', 'Developed policies', 'Resolved disputes', 'Conducted interviews', 'Processed payroll', 'Trained staff', 'Planned succession', 'Benchmarked salaries'],
    'project-manager': ['Planned projects', 'Managed budgets', 'Led teams', 'Tracked milestones', 'Mitigated risks', 'Allocated resources', 'Reported progress', 'Facilitated standups', 'Delivered on time', 'Scoped requirements'],
    pharmacy: ['Dispensed', 'Counselled patients', 'Compounded', 'Verified prescriptions', 'Managed inventory', 'Monitored interactions', 'Educated', 'Stored medications', 'Audited stock', 'Adhered to regulations'],
    'real-estate': ['Sold properties', 'Managed listings', 'Valued assets', 'Negotiated deals', 'Marketed properties', 'Conducted viewings', 'Closed sales', 'Advised clients', 'Drafted contracts', 'Inspected sites'],
    tourism: ['Guided tours', 'Entertained guests', 'Planned itineraries', 'Translated', 'Ensured safety', 'Shared local knowledge', 'Drove routes', 'Managed groups', 'Handled bookings', 'Promoted attractions']
};

/**
 * Profession keywords for ATS optimization.
 * Premium feature — suggested keyword chips per profession.
 */
const PROFESSION_KEYWORDS = {
    healthcare: ['patient care', 'clinical assessment', 'HPCSA registered', 'vital signs', 'infection control', 'wound care', 'medication administration', 'patient education', 'healthcare compliance', 'emergency response', 'community health', 'home-based care', 'HIV/AIDS management', 'hygiene protocols'],
    tech: ['agile methodology', 'CI/CD', 'REST API', 'cloud computing', 'version control', 'full-stack development', 'database management', 'unit testing', 'DevOps', 'system architecture', 'microservices', 'scrum', 'code review', 'technical documentation'],
    teaching: ['curriculum development', 'classroom management', 'lesson planning', 'differentiated instruction', 'student assessment', 'parent engagement', 'CAPS aligned', 'inclusive education', 'early childhood development', 'educational technology', 'formative assessment', 'learning outcomes'],
    engineering: ['CAD design', 'project management', 'technical drawings', 'quality assurance', 'health and safety', 'structural analysis', 'ECSA registered', 'site supervision', 'risk assessment', 'compliance', 'commissioning', 'specifications'],
    finance: ['financial reporting', 'IFRS compliance', 'tax preparation', 'SAICA registered', 'budgeting', 'financial analysis', 'accounts payable', 'accounts receivable', 'general ledger', 'reconciliation', 'audit', 'payroll processing'],
    legal: ['legal research', 'litigation', 'contract drafting', 'compliance', 'dispute resolution', 'due diligence', 'legal opinion', 'advocacy', 'case management', 'court filings', 'intellectual property', 'labour law'],
    hospitality: ['food safety', 'guest relations', 'event coordination', 'HACCP compliance', 'revenue management', 'front office', 'housekeeping', 'food & beverage', 'customer satisfaction', 'booking management', 'tourism grading', 'menu planning'],
    government: ['public administration', 'policy implementation', 'municipal governance', 'PFMA compliance', 'supply chain management', 'Batho Pele principles', 'stakeholder engagement', 'service delivery', 'budget management', 'monitoring & evaluation', 'government regulations', 'community development'],
    trades: ['occupational health & safety', 'trade test certified', 'SAQCC registered', 'equipment maintenance', 'blueprint reading', 'quality control', 'PPE compliance', 'hand tools', 'power tools', 'fault finding', 'installation', 'commissioning'],
    mining: ['mine health & safety', 'blasting certificate', 'DMRE compliance', 'underground mining', 'mineral processing', 'ventilation', 'rock mechanics', 'mine planning', 'shaft sinking', 'ore extraction', 'safety induction', 'environmental management'],
    agriculture: ['crop management', 'livestock management', 'irrigation systems', 'soil analysis', 'pest control', 'farm mechanisation', 'sustainable farming', 'food safety', 'harvest management', 'agricultural chemicals', 'fencing', 'animal husbandry'],
    retail: ['sales targets', 'customer service', 'visual merchandising', 'stock management', 'POS systems', 'loss prevention', 'product knowledge', 'cash handling', 'team supervision', 'inventory control', 'promotions', 'customer retention'],
    'creative-design': ['Adobe Creative Suite', 'UI/UX design', 'branding', 'typography', 'responsive design', 'illustration', 'photography', 'video editing', 'print design', 'digital design', 'wireframing', 'art direction'],
    socialwork: ['case management', 'community development', 'psychosocial support', 'crisis intervention', 'child protection', 'gender-based violence', 'substance abuse', 'group facilitation', 'needs assessment', 'advocacy', 'social grants', 'vulnerable populations'],
    security: ['PSIRA registered', 'access control', 'CCTV monitoring', 'incident reporting', 'fire safety', 'risk assessment', 'patrol management', 'crowd control', 'emergency response', 'security clearance', 'armed response', 'loss prevention'],
    logistics: ['supply chain', 'fleet management', 'warehouse operations', 'freight forwarding', 'customs clearance', 'route optimisation', 'inventory management', 'SAP', 'distribution', 'procurement', 'cross-docking', 'cold chain'],
    academic: ['peer-reviewed publications', 'research methodology', 'grant writing', 'conference presentations', 'student supervision', 'curriculum development', 'thesis examination', 'NRF rated', 'academic writing', 'statistical analysis', 'fieldwork', 'literature review'],
    consulting: ['strategy development', 'stakeholder management', 'business analysis', 'change management', 'process improvement', 'market research', 'client engagement', 'presentation skills', 'benchmarking', 'problem solving', 'project delivery', 'thought leadership'],
    nonprofit: ['grant management', 'fundraising', 'community mobilisation', 'monitoring & evaluation', 'programme management', 'donor reporting', 'volunteer management', 'capacity building', 'impact assessment', 'stakeholder engagement', 'proposal writing', 'social impact'],
    marketing: ['digital marketing', 'SEO/SEM', 'content strategy', 'social media management', 'brand management', 'campaign analytics', 'email marketing', 'Google Analytics', 'copywriting', 'market research', 'lead generation', 'CRM'],
    'data-science': ['Python', 'R programming', 'machine learning', 'SQL', 'data visualisation', 'statistical modelling', 'deep learning', 'Tableau', 'Power BI', 'ETL pipelines', 'big data', 'natural language processing'],
    aviation: ['flight hours', 'type rating', 'instrument rating', 'SACAA licence', 'CRM training', 'safety management', 'pre-flight checks', 'navigation', 'emergency procedures', 'aviation regulations', 'multi-engine', 'weather briefing'],
    media: ['investigative journalism', 'editorial writing', 'media ethics', 'content management', 'social media', 'multimedia production', 'press releases', 'fact-checking', 'deadline management', 'audience engagement', 'broadcasting', 'digital storytelling'],
    banking: ['financial services', 'risk management', 'regulatory compliance', 'KYC/FICA', 'credit assessment', 'digital banking', 'customer relationship', 'product knowledge', 'cross-selling', 'transaction processing', 'fraud detection', 'portfolio management'],
    'medical-doctor': ['clinical practice', 'patient management', 'HPCSA registration', 'CPD points', 'medical ethics', 'specialist referral', 'evidence-based medicine', 'surgical procedures', 'emergency medicine', 'diagnostic imaging', 'prescription management', 'multidisciplinary team'],
    hr: ['talent acquisition', 'employee relations', 'performance management', 'BBBEE compliance', 'labour relations', 'LRA compliance', 'training & development', 'succession planning', 'payroll administration', 'workplace policy', 'CCMA', 'organisational development'],
    'project-manager': ['agile', 'scrum', 'PMP', 'PRINCE2', 'risk management', 'stakeholder management', 'Gantt charts', 'budget management', 'resource allocation', 'milestone tracking', 'change management', 'project lifecycle'],
    pharmacy: ['dispensing', 'SAPC registered', 'pharmaceutical care', 'drug interactions', 'prescription verification', 'compounding', 'inventory management', 'patient counselling', 'Good Pharmacy Practice', 'pharmacovigilance', 'controlled substances', 'OTC medicines'],
    'real-estate': ['property valuation', 'EAAB registered', 'Fidelity Fund Certificate', 'property marketing', 'lease management', 'conveyancing', 'NCA compliance', 'property inspection', 'market analysis', 'client portfolio', 'sales negotiation', 'sectional title'],
    tourism: ['tour guiding', 'FGASA registered', 'customer experience', 'itinerary planning', 'cultural heritage', 'wildlife knowledge', 'first aid certified', 'group management', 'multilingual', 'hospitality', 'local knowledge', 'adventure tourism']
};
