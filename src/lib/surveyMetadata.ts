export type QuestionMeta = {
  tags: string[];
  insight: string;
};

export type QuestionMetadata = {
  [questionKey: string]: {
    [optionValue: string]: QuestionMeta;
  };
};

export const surveyMetadata: QuestionMetadata = {
  user_type: {
    SME: {
      tags: ['SME'],
      insight: 'User operates in an SME environment – small business tools and pricing will matter.',
    },
    startup: {
      tags: ['startup'],
      insight: 'User is in a startup/entrepreneur context – speed and flexibility are key.',
    },
    corporate: {
      tags: ['corporate'],
      insight: 'User works in a corporate environment – workflow, approvals and integration are important.',
    },
    government: {
      tags: ['government'],
      insight: 'User is in government/NGO – compliance and reporting may be strong drivers.',
    },
    education: {
      tags: ['education'],
      insight: 'User is in education – learning journeys, student flows and internal systems may matter.',
    },
  },

  industry: {
    retail: {
      tags: ['industry_retail'],
      insight: 'Retail environment – point of sale, inventory and customer flows may need support.',
    },
    services: {
      tags: ['industry_services'],
      insight: 'Service-based work – bookings and client management tools may be useful.',
    },
    agriculture: {
      tags: ['industry_agriculture'],
      insight: 'Agriculture – field operations, supply chain and logistics may matter.',
    },
    tech: {
      tags: ['industry_tech'],
      insight: 'Tech – likely more open to advanced automation and AI.',
    },
    finance: {
      tags: ['industry_finance'],
      insight: 'Finance – compliance, reporting and data accuracy are critical.',
    },
    healthcare: {
      tags: ['industry_healthcare'],
      insight: 'Healthcare – patient management, compliance and secure data are important.',
    },
    construction: {
      tags: ['industry_construction'],
      insight: 'Construction – project management, scheduling and resource tracking matter.',
    },
    manufacturing: {
      tags: ['industry_manufacturing'],
      insight: 'Manufacturing – production workflows, inventory and quality control are key.',
    },
    hospitality: {
      tags: ['industry_hospitality'],
      insight: 'Hospitality – bookings, customer service and operations management are crucial.',
    },
    other: {
      tags: ['industry_other'],
      insight: 'Industry context noted for custom solutions.',
    },
  },

  role: {
    founder: {
      tags: ['decisionMaker'],
      insight: 'Decision-maker – can act directly on recommendations.',
    },
    manager: {
      tags: ['manager'],
      insight: 'Manager – may influence team workflows and processes.',
    },
    staff: {
      tags: ['staff'],
      insight: 'Staff member – experiences pain directly in day-to-day work.',
    },
    consultant: {
      tags: ['consultant'],
      insight: 'Consultant – looking for tools to serve clients or improve own practice.',
    },
  },

  team_size: {
    solo: {
      tags: ['solo'],
      insight: 'Solo operator – systems that save time personally will have high impact.',
    },
    small: {
      tags: ['smallTeam'],
      insight: 'Small team – simple shared tools can make a big difference.',
    },
    mid: {
      tags: ['midTeam'],
      insight: 'Mid-sized team – coordination and transparency become important.',
    },
    large: {
      tags: ['largeTeam'],
      insight: 'Larger team – workflow, tracking and permissions matter more.',
    },
    enterprise: {
      tags: ['enterpriseTeam'],
      insight: 'Enterprise scale – integrations, compliance and stability are key.',
    },
  },

  main_challenge: {
    getting_customers: {
      tags: ['needsCustomers'],
      insight: "User's main pain is getting customers – visibility, marketing and funnels are critical.",
    },
    admin_overload: {
      tags: ['adminHeavy', 'manualProcess'],
      insight: 'Admin overload – strong signal that automation and workflow tools can save time.',
    },
    no_website: {
      tags: ['lowDigitalPresence'],
      insight: 'Weak online presence – user likely needs a website or stronger digital footprint.',
    },
    manual_quotes: {
      tags: ['manualQuotes', 'paymentsProblem'],
      insight: 'Manual quoting/invoicing – automation here could unlock speed and reduce errors.',
    },
    payments_cashflow: {
      tags: ['paymentsProblem'],
      insight: 'Payments and cash flow are a pain – invoicing, reminders or fintech solutions may help.',
    },
    bookings: {
      tags: ['bookingsIssue'],
      insight: 'Bookings are hard to manage – a booking system or calendar tool could help.',
    },
    ops_tracking: {
      tags: ['opsScattered', 'noTracking'],
      insight: 'Operations feel scattered – a central dashboard or system of record is needed.',
    },
    reporting_analytics: {
      tags: ['reportingIssue'],
      insight: 'Reporting/analytics are painful – a dashboard or automated reporting would add value.',
    },
    customer_comms: {
      tags: ['commsSlow'],
      insight: 'Customer communication is a bottleneck – automation and structured messaging could help.',
    },
  },

  corporate_challenge: {
    slow_approvals: {
      tags: ['approvalsSlow', 'manualProcess'],
      insight: 'Slow approvals – approvals workflow automation is a clear opportunity.',
    },
    corp_manual: {
      tags: ['manualProcess'],
      insight: 'Processes are manual – end-to-end workflow tools and integrations will help.',
    },
    reporting_delays: {
      tags: ['reportingIssue'],
      insight: 'Reporting delays – dashboards and automated data flows are high-value.',
    },
    siloed_data: {
      tags: ['dataSilos', 'disconnectedTools'],
      insight: 'Data is siloed – integrations and centralised platforms could solve this.',
    },
    staff_productivity: {
      tags: ['productivityLow'],
      insight: 'Staff productivity issues – better systems and more automation can unlock capacity.',
    },
    comms_breakdown: {
      tags: ['commsGap'],
      insight: 'Communication gaps – structured channels and notifications could be powerful.',
    },
    compliance_tasks: {
      tags: ['complianceHeavy'],
      insight: 'Compliance is heavy – tracked workflows and audit trails may be important.',
    },
  },

  time_wasters: {
    whatsapp_admin: {
      tags: ['whatsappMessy'],
      insight: 'WhatsApp admin is a major time sink – templates or automation could reduce time.',
    },
    manual_invoicing: {
      tags: ['manualQuotes'],
      insight: 'Manual invoicing/quotes are slow – billing automation has strong value.',
    },
    writing_reports: {
      tags: ['reportingPain'],
      insight: 'Reporting takes time – a reporting dashboard could save hours monthly.',
    },
    spreadsheets: {
      tags: ['spreadsheetsHeavy'],
      insight: 'Heavy spreadsheet use – a database or app might be more reliable.',
    },
    searching_info: {
      tags: ['infoScattered'],
      insight: 'Information is hard to find – a centralised system of record is needed.',
    },
    approvals: {
      tags: ['approvalDelays'],
      insight: 'Approvals cause delays – approval workflows would have strong impact.',
    },
    data_entry: {
      tags: ['dataEntryHeavy'],
      insight: 'Data entry is time-consuming – automation or better forms could help.',
    },
    scheduling: {
      tags: ['schedulingPain'],
      insight: 'Scheduling coordination takes time – calendar automation would help.',
    },
  },

  workflow_frustration: {
    manual_work: {
      tags: ['manualProcess'],
      insight: 'Core frustration is manual work – strongly pointing toward automation.',
    },
    repeat_tasks: {
      tags: ['repeatTasks'],
      insight: 'Repetitive tasks are frustrating – automation of recurring work is valuable.',
    },
    no_tracking: {
      tags: ['noTracking', 'infoScattered'],
      insight: 'No single place to track things – centralized system needed.',
    },
    disconnected_tools: {
      tags: ['disconnectedTools'],
      insight: 'Tools are not connected – integration opportunities exist.',
    },
    slow_comms: {
      tags: ['slowComms'],
      insight: 'Slow communication is frustrating – structured messaging could help.',
    },
    unclear_workflow: {
      tags: ['unclearWorkflow'],
      insight: 'Lack of clarity in processes – workflow documentation and structure needed.',
    },
  },

  digital_level: {
    not_digital: {
      tags: ['beginnerDigital'],
      insight: 'Low digital maturity – start with simple, high-impact tools.',
    },
    basic: {
      tags: ['beginnerDigital'],
      insight: 'Basic digital usage – room to grow with user-friendly tools.',
    },
    semi: {
      tags: ['midDigital'],
      insight: 'Semi-digital – ready for more integrated solutions.',
    },
    full: {
      tags: ['advancedDigital'],
      insight: 'Fully digital – can leverage advanced automation and integrations.',
    },
  },

  current_tools: {
    whatsapp: {
      tags: ['whatsappUser'],
      insight: 'Uses WhatsApp – integration or upgrade opportunities exist.',
    },
    spreadsheets: {
      tags: ['spreadsheetUser'],
      insight: 'Spreadsheet-heavy – database or app migration may add value.',
    },
    crm: {
      tags: ['crmUser'],
      insight: 'Already uses CRM – solutions should integrate or upgrade rather than replace.',
    },
    accounting: {
      tags: ['accountingUser'],
      insight: 'Uses accounting software – financial integrations matter.',
    },
    project_mgmt: {
      tags: ['projectMgmtUser'],
      insight: 'Uses project management tools – workflow coordination is familiar.',
    },
    email_marketing: {
      tags: ['emailMarketingUser'],
      insight: 'Email marketing in use – customer communication is prioritized.',
    },
    none: {
      tags: ['lowTechUser'],
      insight: 'No current tools – greenfield opportunity for simple, powerful solutions.',
    },
  },

  digital_goal: {
    website: {
      tags: ['wantsWebsite'],
      insight: 'Primary goal is a website – online presence is the priority.',
    },
    automation: {
      tags: ['wantsAutomation'],
      insight: 'Primary digital goal is automation – they are ready for time-saving systems.',
    },
    dashboard: {
      tags: ['wantsDashboard'],
      insight: 'Wants dashboard or workflow system – visibility and control are priorities.',
    },
    ai_assistant: {
      tags: ['wantsAI'],
      insight: 'Interested in AI assistant – open to cutting-edge solutions.',
    },
    crm_goal: {
      tags: ['wantsCRM'],
      insight: 'Wants CRM – customer relationship management is a priority.',
    },
    booking: {
      tags: ['wantsBooking'],
      insight: 'Booking tool needed – scheduling and availability management matter.',
    },
    payments: {
      tags: ['wantsPayments'],
      insight: 'Payment system wanted – financial transactions are a pain point.',
    },
    internal_platform: {
      tags: ['wantsInternalSystem'],
      insight: 'Internal platform needed – team collaboration and operations are focus.',
    },
  },

  wants_automation: {
    yes: {
      tags: ['automationReady'],
      insight: 'Ready for automation – high receptiveness to automated solutions.',
    },
    no: {
      tags: ['automationResistant'],
      insight: 'Resistant to automation – education and simple wins may help.',
    },
    unsure: {
      tags: ['automationUnsure'],
      insight: 'Unsure about automation – needs demonstration of value.',
    },
  },

  automation_targets: {
    customer_replies: {
      tags: ['automateReplies'],
      insight: 'Clear demand to automate customer replies – chatbots or templates valuable.',
    },
    reporting: {
      tags: ['automateReporting'],
      insight: 'Wants automated reporting – dashboards and scheduled reports needed.',
    },
    invoicing: {
      tags: ['automateInvoices'],
      insight: 'Invoice automation desired – billing workflow is a pain point.',
    },
    reminders: {
      tags: ['automateReminders'],
      insight: 'Automated reminders wanted – follow-up tasks are time-consuming.',
    },
    approvals: {
      tags: ['automateApprovals'],
      insight: 'Approval automation needed – workflow bottleneck identified.',
    },
    social: {
      tags: ['automateSocial'],
      insight: 'Social media posting automation – marketing efficiency desired.',
    },
    staff_comms: {
      tags: ['automateStaffComms'],
      insight: 'Staff communication automation wanted – internal efficiency focus.',
    },
  },

  ai_openness: {
    excited: {
      tags: ['AIpositive'],
      insight: 'Excited about AI – early adopter, ready for AI-powered solutions.',
    },
    curious: {
      tags: ['AIcurious'],
      insight: 'Curious about AI – open to learning and trying AI features.',
    },
    neutral: {
      tags: ['AIneutral'],
      insight: 'Neutral on AI – needs clear value proposition.',
    },
    nervous: {
      tags: ['AInervous'],
      insight: 'Nervous about AI – education and gradual introduction needed.',
    },
  },

  solution_guess: {
    website_sol: {
      tags: ['wantsWebsite'],
      insight: 'Believes website is the solution – online presence validation.',
    },
    automation_sol: {
      tags: ['wantsAutomation'],
      insight: 'Identifies automation as solution – product-market fit indicator.',
    },
    dashboard_sol: {
      tags: ['wantsDashboard'],
      insight: 'Dashboard seen as solution – data visibility is key need.',
    },
    ai_sol: {
      tags: ['wantsAI'],
      insight: 'AI identified as solution – innovative mindset.',
    },
    crm_sol: {
      tags: ['wantsCRM'],
      insight: 'CRM as solution – customer management is priority.',
    },
    booking_sol: {
      tags: ['wantsBooking'],
      insight: 'Booking system identified – scheduling pain confirmed.',
    },
    payment_sol: {
      tags: ['wantsPayments'],
      insight: 'Payment system needed – financial workflow priority.',
    },
    internal_sol: {
      tags: ['wantsInternalSystem'],
      insight: 'Internal platform needed – operations focus confirmed.',
    },
  },

  urgent_feature: {
    tracking: {
      tags: ['urgentTracking'],
      insight: 'Urgent need: track tasks and operations – visibility is critical.',
    },
    automate_messages: {
      tags: ['urgentAutomation'],
      insight: 'Urgent need: automate messages – communication efficiency critical.',
    },
    centralise_comms: {
      tags: ['urgentComms'],
      insight: 'Urgent need: centralize communication – scattered channels are painful.',
    },
    faster_reporting: {
      tags: ['urgentReporting'],
      insight: 'Urgent need: faster reporting – data access is bottleneck.',
    },
    get_customers: {
      tags: ['urgentLeads'],
      insight: 'Urgent need: get more customers – growth is immediate priority.',
    },
    manage_staff: {
      tags: ['urgentStaff'],
      insight: 'Urgent need: manage staff – team coordination is critical.',
    },
  },

  budget: {
    under_500: {
      tags: ['lowBudget'],
      insight: 'Budget under R500/month – cost-effectiveness is critical.',
    },
    '500_1500': {
      tags: ['lowMidBudget'],
      insight: 'Budget R500-1500/month – moderate spend capacity.',
    },
    '1500_3000': {
      tags: ['midBudget'],
      insight: 'Budget R1500-3000/month – ready for quality solutions.',
    },
    '3000_7000': {
      tags: ['midHighBudget'],
      insight: 'Budget R3000-7000/month – strong investment capacity.',
    },
    '7000_plus': {
      tags: ['highBudget'],
      insight: 'Budget R7000+/month – premium solutions viable.',
    },
  },

  urgency: {
    asap: {
      tags: ['urgent'],
      insight: 'Needs solution ASAP – immediate pain, ready to act now.',
    },
    this_month: {
      tags: ['nearTerm'],
      insight: 'Needs solution this month – near-term priority.',
    },
    this_quarter: {
      tags: ['mediumUrgency'],
      insight: 'Planning for this quarter – medium-term project.',
    },
    this_year: {
      tags: ['longTerm'],
      insight: 'Planning for this year – long-term strategy.',
    },
  },

  consent: {
    yes: {
      tags: ['consentYes'],
      insight: 'Consent given – can follow up with personalized outreach.',
    },
    no: {
      tags: ['consentNo'],
      insight: 'Consent declined – anonymous insights only.',
    },
  },
};

export function getMetadata(questionKey: string, answerValue: string | string[]): QuestionMeta {
  if (Array.isArray(answerValue)) {
    const allTags: string[] = [];
    const allInsights: string[] = [];

    answerValue.forEach((val) => {
      const meta = surveyMetadata[questionKey]?.[val];
      if (meta) {
        allTags.push(...meta.tags);
        allInsights.push(meta.insight);
      }
    });

    return {
      tags: allTags,
      insight: allInsights.join(' | '),
    };
  }

  return (
    surveyMetadata[questionKey]?.[answerValue] || {
      tags: [],
      insight: '',
    }
  );
}
