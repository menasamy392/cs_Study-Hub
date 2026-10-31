export const INITIAL_SUBJECTS = [
  {
    id: "sub-5",
    name: "Compiler Design",
    code: "CS321 / CS309",
    instructor: "Dr. Lamiaa Hassaan (exams also Dr. Ahmed Ibrahim)",
    semester: "Level 3 • Semester 1 • Core course",
    description: "Lexical analysis, syntax analysis (LL and LR parsing), semantic checking, intermediate code generation, and runtime memory management.",
    icon: "Cpu",
    color: "blue",
    order_index: 1,
    created_at: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "sub-1",
    name: "Database 2",
    code: "CS312",
    instructor: "Dr. Ahmed Mansour",
    semester: "Level 3 • Semester 2 • Core course",
    description: "Advanced relational database management, query optimization, indexing, transaction processing, concurrency control, and NoSQL databases.",
    icon: "Database",
    color: "emerald",
    order_index: 2,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "sub-2",
    name: "DSS Modeling and Analysis",
    code: "CS421",
    instructor: "Dr. Hanaa Mostafa",
    semester: "Level 4 • Semester 1 • Major course",
    description: "Decision Support Systems, multi-criteria decision making, predictive modeling, data warehousing concepts, and analytical hierarchy processes.",
    icon: "BarChart3",
    color: "indigo",
    order_index: 3,
    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "sub-3",
    name: "E-Commerce",
    code: "CS335",
    instructor: "Dr. Tarek El-Sayed",
    semester: "Level 3 • Semester 1 • Core course",
    description: "Electronic commerce architectures, digital payment gateways, security protocols (SSL/TLS), online marketing systems, and cloud-hosted retail infrastructures.",
    icon: "ShoppingCart",
    color: "amber",
    order_index: 4,
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "sub-4",
    name: "Data Protection",
    code: "CS442",
    instructor: "Dr. Khaled Fawzy",
    semester: "Level 4 • Semester 2 • Security track",
    description: "Information security governance, cryptography foundations, access control models, GDPR/compliance, and defenses against privacy breaches.",
    icon: "ShieldCheck",
    color: "rose",
    order_index: 5,
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  }
];

// Sample public reliable test PDF URLs for demo previewing
const SAMPLE_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const SAMPLE_COMPILER_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

export const INITIAL_MATERIALS = [
  // ==========================================
  // Compiler Design Materials (From Screenshot)
  // ==========================================
  {
    id: "mat-501",
    subject_id: "sub-5",
    title: "Lecture 1: Introduction to Compilers",
    type: "lecture",
    number: 1,
    description: "15 past-exam questions come from this lecture. Compiler phases, symbol table, and translation pipeline.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec01_Introduction.pdf",
    file_size: "2.8 MB",
    created_at: new Date(Date.now() - 32 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-502",
    subject_id: "sub-5",
    title: "Lecture 2: Lexical Analysis & Scanner Design",
    type: "lecture",
    number: 2,
    description: "Token recognition, regular expressions, Lex/Flex generator, and finite automata construction.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec02_Lexical_Analysis.pdf",
    file_size: "3.2 MB",
    created_at: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-503",
    subject_id: "sub-5",
    title: "Lecture 3: NFA vs DFA and NFA to DFA Subset Construction",
    type: "lecture",
    number: 3,
    description: "Thompson's construction algorithm, epsilon-closures, and subset construction steps.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec03_NFA_DFA.pdf",
    file_size: "2.1 MB",
    created_at: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-504",
    subject_id: "sub-5",
    title: "Lecture 4: Syntax Analysis: CFG & Ambiguity",
    type: "lecture",
    number: 4,
    description: "Context-free grammars, derivations, parse trees, and eliminating ambiguity & left recursion.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec04_Syntax_Analysis.pdf",
    file_size: "3.4 MB",
    created_at: new Date(Date.now() - 17 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-505",
    subject_id: "sub-5",
    title: "Lecture 5: Top-Down Parsing & Recursive Descent",
    type: "lecture",
    number: 5,
    description: "Predictive parsing, FIRST and FOLLOW sets, and building non-backtracking top-down parsers.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec05_Predictive_Parsing.pdf",
    file_size: "2.6 MB",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-506",
    subject_id: "sub-5",
    title: "Lecture 6: LL(1) Parsing: FIRST & FOLLOW Sets",
    type: "lecture",
    number: 6,
    description: "Table construction for LL(1) grammars and resolving LL(1) conflicts.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec06_LL1_Parsing.pdf",
    file_size: "2.9 MB",
    created_at: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-507",
    subject_id: "sub-5",
    title: "Lecture 7: Bottom-Up Parsing (LR, SLR & LALR)",
    type: "lecture",
    number: 7,
    description: "Shift-reduce actions, item sets, DFA of LR(0) items, and SLR parsing table derivation.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec07_BottomUp_Parsing.pdf",
    file_size: "3.1 MB",
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-508",
    subject_id: "sub-5",
    title: "Lecture 8: Semantic Analysis Part 1: Type Checking",
    type: "lecture",
    number: 8,
    description: "Syntax-directed translation (SDT), synthesized vs inherited attributes, and type systems.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec08_Semantic_Analysis.pdf",
    file_size: "2.5 MB",
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-509",
    subject_id: "sub-5",
    title: "Lecture 9: Runtime Environment & Intermediate Code",
    type: "lecture",
    number: 9,
    description: "Activation records, stack management, three-address code (TAC), and basic block optimization.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Lec09_Runtime_CodeGen.pdf",
    file_size: "3.5 MB",
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-510",
    subject_id: "sub-5",
    title: "Section 1: Implementing Flex Lexer in C++",
    type: "section",
    number: 1,
    description: "Hands-on setup for scanner token rules and compiling lex.yy.c with g++.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "https://github.com/westes/flex",
    file_name: "Compiler_Section01_Flex.pdf",
    file_size: "1.4 MB",
    sheet_pdf_url: SAMPLE_COMPILER_PDF,
    sheet_file_name: "Compiler_Section01_Flex_Exercises.pdf",
    sheet_file_size: "1.4 MB",
    solution_pdf_url: SAMPLE_COMPILER_PDF,
    solution_file_name: "Compiler_Section01_Flex_Model_Solution.pdf",
    solution_file_size: "1.8 MB",
    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-511",
    subject_id: "sub-5",
    title: "Section 2: Bison / Yacc Parser Generation",
    type: "section",
    number: 2,
    description: "Grammar rules specification, operator precedence, and AST construction.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Section02_Bison.pdf",
    file_size: "1.8 MB",
    sheet_pdf_url: SAMPLE_COMPILER_PDF,
    sheet_file_name: "Compiler_Section02_Bison_Grammar_Sheet.pdf",
    sheet_file_size: "1.8 MB",
    solution_pdf_url: "",
    solution_file_name: "",
    solution_file_size: "",
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-512",
    subject_id: "sub-5",
    title: "Quiz 1: Lexical Analysis, NFAs & CFGs",
    type: "quiz",
    number: 1,
    description: "37 questions on regular expressions, FIRST/FOLLOW calculation, and grammar ambiguity. 70% to pass.",
    file_url: "",
    external_url: "https://forms.gle/sample-quiz-compiler-1",
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-513",
    subject_id: "sub-5",
    title: "Compiler Design Complete Midterm Revision Notes",
    type: "study_material",
    category: "summary",
    description: "Comprehensive 9-section high-yield summary of all exam parsing algorithms and conversion rules.",
    file_url: SAMPLE_COMPILER_PDF,
    external_url: "",
    file_name: "Compiler_Midterm_HighYield_Notes.pdf",
    file_size: "1.9 MB",
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-514",
    subject_id: "sub-5",
    title: "Video: How Compilers Work in 15 Minutes",
    type: "study_material",
    category: "video",
    description: "End-to-end visual breakdown from source code to machine assembly instructions.",
    file_url: "",
    external_url: "https://www.youtube.com/watch?v=QXjU9qTsYCc",
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
  },

  // ==========================================
  // Database 2 Materials
  // ==========================================
  {
    id: "mat-101",
    subject_id: "sub-1",
    title: "Lecture 1: Advanced Relational Algebra & Query Trees",
    type: "lecture",
    number: 1,
    description: "Introduction to relational algebra equivalence rules and heuristic query optimization.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DB2_Lecture_01_Query_Trees.pdf",
    file_size: "2.4 MB",
    created_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-102",
    subject_id: "sub-1",
    title: "Lecture 2: Indexing Structures, B+ Trees & Hashing",
    type: "lecture",
    number: 2,
    description: "In-depth breakdown of primary, secondary, and clustered indexing mechanisms.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DB2_Lecture_02_BPlus_Trees.pdf",
    file_size: "3.1 MB",
    created_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-103",
    subject_id: "sub-1",
    title: "Lecture 3: Concurrency Control & ACID Protocols",
    type: "lecture",
    number: 3,
    description: "Serializability schedules, two-phase locking (2PL), deadlock prevention and timestamp ordering.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DB2_Lecture_03_Concurrency_Control.pdf",
    file_size: "1.9 MB",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-104",
    subject_id: "sub-1",
    title: "Section 1: PostgreSQL EXPLAIN ANALYZE Hands-on",
    type: "section",
    number: 1,
    description: "Practical laboratory guide to reading cost metrics and query plans in Postgres.",
    file_url: SAMPLE_PDF,
    external_url: "https://www.postgresql.org/docs/current/using-explain.html",
    file_name: "DB2_Section_01_Explain_Analyze.pdf",
    file_size: "1.2 MB",
    sheet_pdf_url: SAMPLE_PDF,
    sheet_file_name: "DB2_Section_01_Explain_Sheet.pdf",
    sheet_file_size: "1.2 MB",
    solution_pdf_url: SAMPLE_PDF,
    solution_file_name: "DB2_Section_01_Query_Solutions.pdf",
    solution_file_size: "1.5 MB",
    created_at: new Date(Date.now() - 26 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-105",
    subject_id: "sub-1",
    title: "Section 2: Implementing Complex Triggers & Views",
    type: "section",
    number: 2,
    description: "Step-by-step PL/pgSQL scripts for automated audit trails and materialized views.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DB2_Section_02_Triggers_Views.pdf",
    file_size: "1.5 MB",
    sheet_pdf_url: SAMPLE_PDF,
    sheet_file_name: "DB2_Section_02_Triggers_Sheet.pdf",
    sheet_file_size: "1.5 MB",
    solution_pdf_url: "",
    solution_file_name: "",
    solution_file_size: "",
    created_at: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-106",
    subject_id: "sub-1",
    title: "Quiz 1: Query Optimization & Indexing Assessment",
    type: "quiz",
    number: 1,
    description: "15 multiple-choice questions on B+ tree height calculation and cost estimates.",
    file_url: "",
    external_url: "https://forms.gle/sample-quiz-db2-1",
    created_at: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-107",
    subject_id: "sub-1",
    title: "Database 2 Full Midterm Revision Cheat Sheet",
    type: "study_material",
    category: "summary",
    description: "High-yield 4-page summary covering formulas, lock compatibility matrices, and SQL optimizations.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DB2_Midterm_Cheat_Sheet.pdf",
    file_size: "1.1 MB",
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-108",
    subject_id: "sub-1",
    title: "Video: How B+ Trees Work Step-by-Step",
    type: "study_material",
    category: "video",
    description: "Visual animated walkthrough explaining insertion, node splitting, and search paths in B+ trees.",
    file_url: "",
    external_url: "https://www.youtube.com/watch?v=aZjYr87r1b8",
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },

  // ==========================================
  // DSS Modeling and Analysis Materials
  // ==========================================
  {
    id: "mat-201",
    subject_id: "sub-2",
    title: "Lecture 1: Introduction to Decision Support Architectures",
    type: "lecture",
    number: 1,
    description: "Taxonomy of DSS, Simon's decision making model, and business intelligence pipelines.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DSS_Lecture_01_Architecture.pdf",
    file_size: "2.8 MB",
    created_at: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-202",
    subject_id: "sub-2",
    title: "Lecture 2: Multi-Criteria Decision Analysis (AHP & TOPSIS)",
    type: "lecture",
    number: 2,
    description: "Pairwise comparison matrices, consistency index calculations, and ranking criteria.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DSS_Lecture_02_MCDA_Methods.pdf",
    file_size: "3.4 MB",
    created_at: new Date(Date.now() - 17 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-203",
    subject_id: "sub-2",
    title: "Section 1: Building AHP Models in Python & Excel",
    type: "section",
    number: 1,
    description: "Practical worksheet on calculating eigenvectors and verifying consistency ratios.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DSS_Section_01_AHP_Models.pdf",
    file_size: "1.4 MB",
    sheet_pdf_url: SAMPLE_PDF,
    sheet_file_name: "DSS_Section_01_AHP_Sheet.pdf",
    sheet_file_size: "1.4 MB",
    solution_pdf_url: SAMPLE_PDF,
    solution_file_name: "DSS_Section_01_AHP_Excel_Solution.pdf",
    solution_file_size: "1.9 MB",
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-204",
    subject_id: "sub-2",
    title: "Quiz 1: MCDA Foundations & AHP Practice",
    type: "quiz",
    number: 1,
    description: "Online quiz with instant scoring evaluating decision matrices and normalization methods.",
    file_url: "",
    external_url: "https://forms.gle/sample-quiz-dss-1",
    created_at: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-205",
    subject_id: "sub-2",
    title: "Video: Analytic Hierarchy Process (AHP) Explained with Example",
    type: "study_material",
    category: "video",
    description: "Clear 12-minute breakdown of pairwise comparisons and priority vector calculations.",
    file_url: "",
    external_url: "https://www.youtube.com/watch?v=J4T70o8gjlk",
    created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-206",
    subject_id: "sub-2",
    title: "Decision Modeling Formula Sheet & Solved Cases",
    type: "study_material",
    category: "summary",
    description: "Compact revision PDF containing all required formulas for linear programming and sensitivity analysis.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DSS_Revision_Formula_Sheet.pdf",
    file_size: "980 KB",
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },

  // ==========================================
  // E-Commerce Materials
  // ==========================================
  {
    id: "mat-301",
    subject_id: "sub-3",
    title: "Lecture 1: E-Commerce Business Models & Digital Ecosystems",
    type: "lecture",
    number: 1,
    description: "B2B, B2C, C2C marketplaces, revenue models, and omnichannel commerce strategies.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "ECommerce_Lecture_01_Models.pdf",
    file_size: "2.1 MB",
    created_at: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-302",
    subject_id: "sub-3",
    title: "Lecture 2: Digital Payment Systems & Security Standards",
    type: "lecture",
    number: 2,
    description: "Payment gateways, PCI-DSS compliance, tokenization, and multi-factor authorization.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "ECommerce_Lecture_02_Payments.pdf",
    file_size: "2.6 MB",
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-303",
    subject_id: "sub-3",
    title: "Section 1: Integrating Stripe API in Node.js / React",
    type: "section",
    number: 1,
    description: "Step-by-step code tutorial to set up test checkout sessions and webhook listeners.",
    file_url: SAMPLE_PDF,
    external_url: "https://stripe.com/docs/payments",
    file_name: "ECommerce_Section_01_Stripe_Integration.pdf",
    file_size: "1.7 MB",
    sheet_pdf_url: SAMPLE_PDF,
    sheet_file_name: "ECommerce_Section_01_Stripe_Sheet.pdf",
    sheet_file_size: "1.7 MB",
    solution_pdf_url: SAMPLE_PDF,
    solution_file_name: "ECommerce_Section_01_Stripe_Solution.pdf",
    solution_file_size: "1.8 MB",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-304",
    subject_id: "sub-3",
    title: "E-Commerce Architecture & Payment Gateways Summary",
    type: "study_material",
    category: "summary",
    description: "Structured summary of SSL handshake, SET protocol, and 3D Secure 2.0 flowcharts.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "ECommerce_Payment_Gateways_Summary.pdf",
    file_size: "1.3 MB",
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
  },

  // ==========================================
  // Data Protection Materials
  // ==========================================
  {
    id: "mat-401",
    subject_id: "sub-4",
    title: "Lecture 1: Principles of Data Protection & Threat Modeling",
    type: "lecture",
    number: 1,
    description: "Confidentiality, Integrity, Availability (CIA triad), STRIDE model, and attack surface analysis.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DataProtection_Lecture_01_Principles.pdf",
    file_size: "2.3 MB",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-402",
    subject_id: "sub-4",
    title: "Lecture 2: Modern Cryptography & Key Management",
    type: "lecture",
    number: 2,
    description: "Symmetric (AES) vs Asymmetric (RSA, ECC), digital signatures, and public key infrastructures.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DataProtection_Lecture_02_Cryptography.pdf",
    file_size: "3.0 MB",
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-403",
    subject_id: "sub-4",
    title: "Section 1: Hands-on OpenSSL Encryption & Cert Generation",
    type: "section",
    number: 1,
    description: "Command line lab guide to encrypting files with AES-256-GCM and generating self-signed certificates.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DataProtection_Section_01_OpenSSL_Guide.pdf",
    file_size: "1.6 MB",
    sheet_pdf_url: SAMPLE_PDF,
    sheet_file_name: "DataProtection_Section_01_OpenSSL_Sheet.pdf",
    sheet_file_size: "1.6 MB",
    solution_pdf_url: "",
    solution_file_name: "",
    solution_file_size: "",
    created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-404",
    subject_id: "sub-4",
    title: "Quiz 1: Cryptography & Security Controls Test",
    type: "quiz",
    number: 1,
    description: "Self-assessment quiz on hashing algorithms, salting, collision resistance, and digital certificates.",
    file_url: "",
    external_url: "https://forms.gle/sample-quiz-dataprotection-1",
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-405",
    subject_id: "sub-4",
    title: "Video: How Public Key Cryptography Works Under the Hood",
    type: "study_material",
    category: "video",
    description: "Visual and intuitive demonstration of Diffie-Hellman and RSA asymmetric keys.",
    file_url: "",
    external_url: "https://www.youtube.com/watch?v=GSIDS_lvRv4",
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "mat-406",
    subject_id: "sub-4",
    title: "Data Protection Regulatory & Technical Reference Sheet",
    type: "study_material",
    category: "summary",
    description: "Quick revision matrix covering GDPR articles, RBAC vs ABAC models, and cryptographic key lengths.",
    file_url: SAMPLE_PDF,
    external_url: "",
    file_name: "DataProtection_Reference_Sheet.pdf",
    file_size: "890 KB",
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  }
];

// ==========================================
// Announcements (Linked to Subjects)
// ==========================================
export const INITIAL_ANNOUNCEMENTS = [
  {
    id: "ann-1",
    subject_id: "sub-5",
    title: "Compiler Design Midterm Exam Announcement",
    description: "The midterm exam will cover Lectures 1 to 4 (Introduction through Syntax Analysis). Please review all FIRST/FOLLOW worksheets.",
    category: "Exam",
    is_important: true,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: "ann-2",
    subject_id: "sub-5",
    title: "Flex Lexer Lab Assignment Deadline",
    description: "Section 1 practical assignment submission is due this Thursday at 11:59 PM on GitHub Classroom.",
    category: "Assignment",
    is_important: true,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: "ann-3",
    subject_id: "sub-1",
    title: "Database 2: B+ Trees Revision Sheet Released",
    description: "Check the Study Notes tab for the updated 4-page cheat sheet on B+ tree insertion algorithms.",
    category: "New Lecture",
    is_important: false,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: "ann-4",
    subject_id: "sub-2",
    title: "Quiz 1 on MCDA & AHP Now Available",
    description: "Online self-assessment quiz is live. Complete it before next Sunday to test your pairwise consistency calculations.",
    category: "Quiz",
    is_important: true,
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: "ann-5",
    subject_id: "sub-3",
    title: "E-Commerce: Practical Section 1 Stripe Demo",
    description: "Practical section slides and code walkthrough for Node.js Stripe checkout have been uploaded to Section 1.",
    category: "New Section",
    is_important: false,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: "ann-6",
    subject_id: "sub-4",
    title: "Department Privacy Law & GDPR Guest Lecture",
    description: "A special webinar with cyber-law specialists on European GDPR compliance and breach notification procedures.",
    category: "General Announcement",
    is_important: false,
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    expires_at: null
  }
];

// ==========================================
// Academic Warning Documents (No dummy data: populated by Admin upload or Supabase)
// ==========================================
export const INITIAL_WARNINGS = [];

