// Knowledge base for the "Ask my portfolio" assistant.
// Each entry is one retrievable chunk. Keep facts here in sync with
// index.html — the assistant can only say what is written below.
// Files starting with "_" are not exposed as Vercel routes.

export const KB = [
  {
    id: 'profile',
    title: 'Profile',
    text: 'Aditya Ahirrao is a UI/UX designer and a Computer Science and Design undergraduate specialising in AI systems, backend engineering and full-stack application development. He builds Retrieval-Augmented Generation (RAG) applications, LLM-powered solutions and scalable software systems, and designs the interfaces people use with them. He is a Smart India Hackathon 2025 national winner, an AI/ML intern at Hindustan Aeronautics Limited (HAL), and a student leader. He is open to internships.',
  },
  {
    id: 'hal',
    title: 'HAL — AI & ML Intern',
    text: 'AI & Machine Learning Intern at Hindustan Aeronautics Ltd (HAL), Nashik, India, June 2026 to July 2026. Engineered a RAG pipeline with semantic search and vector embeddings over 10,000+ pages and 500+ figures of aircraft manuals and accident reports. Built retrieval with ChromaDB and Sentence Transformers, reducing document retrieval from minutes to seconds. Used Docling for structured extraction from the manuals, then deployed local Ollama LLMs for citation-backed responses and analytics. Stack: RAG, ChromaDB, Sentence Transformers, Docling, Ollama.',
  },
  {
    id: 'wrs',
    title: 'WRS Energy — Digital Marketing',
    text: 'Digital Marketing & Content Strategist at WRS Energy Solutions, a remote contract role from February 2026 to June 2026. Applied digital marketing and SEO fundamentals to plan audience-focused content aligned with brand messaging. Drove 24.4% net growth in targeted Instagram followers across a focused 4-month content strategy period. Skills: SEO, content strategy, analytics.',
  },
  {
    id: 'runverve',
    title: 'Runverve — UI/UX Designer',
    text: 'UI/UX Designer & Researcher for Runverve (Smart Heal), a remote sponsored project from November 2025 to January 2026. Runverve is an IIT Madras incubated startup. Conducted user research and designed 20+ high-fidelity Figma screens for a sponsored React Native application. Integrated third-party RESTful APIs for secure data exchange and real-time content synchronisation. Smart Heal is a smart fitness tracking application with AI-powered insights and recommendations.',
  },
  {
    id: 'leadership',
    title: 'Leadership overview',
    text: 'Leadership roles held by Aditya as a student leader: President of the Design Society (2024 to present, Vice President 2023 to 2024); Chairman of Branding at Young Indians KKWIEER (2025 to present) and Co-Chair of Road Safety (2025); Head of Design & Branding for the INNOVERA national hackathon (2025); Core Committee Member of ISTE (2025 to present); Design Team Member for TEDxKKWIEER (2025).',
  },
  {
    id: 'desoc',
    title: 'Design Society — President',
    text: 'Leadership role. Design Society (DeSoc) is the design club of KKWIEER that organises tech and non-tech events. Aditya has been President since 2024 and was Vice President from 2023 to 2024. He also built the official DeSoc website showcasing events, team and achievements.',
  },
  {
    id: 'yi',
    title: 'Young Indians — Branding Chair',
    text: 'Leadership role. Young Indians (Yi), KKWIEER Chapter, a movement for Indian youth. Aditya has been Chairman of Branding since 2025 and was Co-Chair of Road Safety in 2025. As Branding Chair he leads branding for social-cause and youth-empowerment drives at Yi KKWIEER.',
  },
  {
    id: 'innovera',
    title: 'INNOVERA — Head of Design',
    text: 'Leadership role. INNOVERA is a national-level hackathon with 1,000+ participants. Aditya was Head of Design & Branding in 2025 and led its branding end to end.',
  },
  {
    id: 'iste-tedx',
    title: 'ISTE & TEDxKKWIEER',
    text: 'Leadership and speaking. Aditya has been a Core Committee Member of ISTE (Indian Society for Technical Education) since 2025. He was a Design Team Member for TEDxKKWIEER in 2025, an international event themed "Rise Through Resonance". He was an invited speaker at the ISTE Master Students Programme (MSP) 2025 with a talk titled "Perfection Paradox".',
  },
  {
    id: 'sih',
    title: 'Smart India Hackathon 2025',
    text: 'Aditya won Smart India Hackathon 2025 as a national winner for the Ministry of Agriculture & Farmers Welfare problem statement, at BPUT Rourkela, Odisha. The winning work was SWASTHYAM. He was later felicitated as a hackathon winner by the Department of Computer Science & Design, KKWIEER.',
  },
  {
    id: 'swasthyam',
    title: 'Project — SWASTHYAM',
    text: 'SWASTHYAM is an AI-powered healthcare management system and a national campaign for the Ministry of Agriculture and Farmers Welfare, Government of India, aimed at reducing edible oil consumption. Areas: healthcare, UI/UX, mobile app development.',
  },
  {
    id: 'projects',
    title: 'Other projects',
    text: 'Health Companion: a personal health assistant and mediator between doctor and patient, with wellness tracking, health goal management and a Telegram bot. Medication Reminder: a smart medication reminder app with notifications and tracking. DeSoc Website: the official Design Society website. Smart Heal (Runverve): fitness tracking with AI-powered insights.',
  },
  {
    id: 'skills',
    title: 'Skills & stack',
    text: 'AI & machine learning: RAG, LangChain, ChromaDB, Sentence Transformers, Ollama, Docling — retrieval pipelines that answer with citations. Backend & data: Python, FastAPI, Node.js, REST, MongoDB, SQL. Frontend & mobile: React, React Native, JavaScript, HTML5, CSS3, responsive UI. Design & research: Figma, design systems, prototyping, user research, branding; 20+ high-fidelity screens shipped.',
  },
  {
    id: 'education',
    title: 'Education',
    text: 'B.Tech in Computer Science and Design at K K Wagh Institute of Engineering Education & Research (KKWIEER), Nashik, 2023 to present, CGPA 8.76. Higher secondary education at Govt Arts and Science College, Chhatrapati Sambhajinagar, 2021 to 2023 (State Board). Services Preparatory Institute (SPI), Chhatrapati Sambhajinagar, 2021 to 2023 — a Government of Maharashtra military school preparing for UPSC NDA; he reached SSB conference-out at 17 SSB Bangalore (NDA 150) on 2 April 2023. CBSE schooling at PSBA English School, 2015 to 2021, 82%.',
  },
  {
    id: 'personal',
    title: 'Beyond work',
    text: 'Aditya completed the Dams of Nashik Ride, a long-distance cycling expedition across the prominent dams of Nashik (about 107 km). He went through defence selection training at the Services Preparatory Institute.',
  },
  {
    id: 'contact',
    title: 'Contact',
    text: 'The best way to reach Aditya is the contact form on this site, or LinkedIn. His résumé can be downloaded from the site. He is open to internships, especially in AI engineering, full-stack development and UI/UX design.',
  },
];
