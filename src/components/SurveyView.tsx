import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Lightbulb, Tag as TagIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMetadata } from '../lib/surveyMetadata';
import { useAuth } from '../contexts/AuthContext';

type SurveyData = {
  user_type?: string;
  industry?: string;
  role?: string;
  team_size?: string;
  main_challenge?: string;
  corporate_challenge?: string;
  time_wasters?: string[];
  workflow_frustration?: string;
  digital_level?: string;
  current_tools?: string[];
  digital_goal?: string;
  wants_automation?: string;
  automation_targets?: string[];
  ai_openness?: string;
  solution_guess?: string;
  urgent_feature?: string;
  budget?: string;
  urgency?: string;
  consent?: boolean;
  name?: string;
  email?: string;
  phone?: string;
};

export function SurveyView() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [surveyData, setSurveyData] = useState<SurveyData>({});
  const [liveTags, setLiveTags] = useState<string[]>([]);
  const [liveInsights, setLiveInsights] = useState<string[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeSurvey();
  }, [user]);

  const initializeSurvey = async () => {
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        user_id: user?.id || null,
        current_step: 0,
      })
      .select()
      .single();

    if (!error && data) {
      setResponseId(data.id);
    }
  };

  const updateResponse = async (questionKey: string, answerValue: string | string[] | boolean) => {
    if (!responseId) return;

    setLoading(true);

    const meta = getMetadata(questionKey, answerValue as string | string[]);
    const newTags = [...liveTags, ...meta.tags];
    const newInsights = meta.insight ? [...liveInsights, meta.insight] : liveInsights;

    setLiveTags(newTags);
    setLiveInsights(newInsights);

    const updateData: any = {
      [questionKey]: answerValue,
      live_tags: newTags,
      live_insights: newInsights,
      current_step: currentStep + 1,
    };

    await supabase.from('survey_responses').update(updateData).eq('id', responseId);

    await supabase.from('survey_events').insert({
      response_id: responseId,
      step_number: currentStep,
      question_key: questionKey,
      answer_value: Array.isArray(answerValue) ? answerValue.join(',') : String(answerValue),
      tags_added: meta.tags,
      insights_added: meta.insight ? [meta.insight] : [],
    });

    setLoading(false);
  };

  const handleNext = async () => {
    const question = questions[currentStep];
    if (!question) return;

    const answer = surveyData[question.key as keyof SurveyData];
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return;

    await updateResponse(question.key, answer);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (responseId) {
        await supabase
          .from('survey_responses')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', responseId);
      }
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnswer = (key: string, value: string | string[] | boolean) => {
    setSurveyData({ ...surveyData, [key]: value });
  };

  const handleMultiSelect = (key: string, value: string) => {
    const current = (surveyData[key as keyof SurveyData] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setSurveyData({ ...surveyData, [key]: updated });
  };

  const questions = [
    {
      key: 'user_type',
      title: 'What best describes the environment you work in?',
      type: 'single',
      options: [
        { value: 'SME', label: 'Small Business (SME)' },
        { value: 'startup', label: 'Startup / Entrepreneur' },
        { value: 'corporate', label: 'Corporate / Enterprise' },
        { value: 'government', label: 'Government / NGO' },
        { value: 'education', label: 'Educational Institution' },
      ],
    },
    {
      key: 'industry',
      title: 'What industry do you operate in?',
      type: 'single',
      options: [
        { value: 'retail', label: 'Retail' },
        { value: 'services', label: 'Services' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'tech', label: 'Tech / Software' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'construction', label: 'Construction' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      key: 'role',
      title: 'What is your role?',
      type: 'single',
      options: [
        { value: 'founder', label: 'Founder / Owner' },
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Employee / Staff' },
        { value: 'consultant', label: 'Consultant' },
      ],
    },
    {
      key: 'team_size',
      title: 'How big is your team?',
      type: 'single',
      options: [
        { value: 'solo', label: 'Just me' },
        { value: 'small', label: '2–5 people' },
        { value: 'mid', label: '6–20 people' },
        { value: 'large', label: '20–100 people' },
        { value: 'enterprise', label: '100+ people' },
      ],
    },
    {
      key: surveyData.user_type === 'SME' || surveyData.user_type === 'startup' ? 'main_challenge' : 'corporate_challenge',
      title: 'What is your biggest challenge right now?',
      type: 'single',
      options:
        surveyData.user_type === 'SME' || surveyData.user_type === 'startup'
          ? [
              { value: 'getting_customers', label: 'Getting customers' },
              { value: 'admin_overload', label: 'Admin overload' },
              { value: 'no_website', label: 'No website / weak online presence' },
              { value: 'manual_quotes', label: 'Manual quoting / invoicing' },
              { value: 'payments_cashflow', label: 'Payments & cash flow' },
              { value: 'bookings', label: 'Managing bookings' },
              { value: 'ops_tracking', label: 'Keeping track of operations' },
              { value: 'reporting_analytics', label: 'Reporting & analytics' },
              { value: 'customer_comms', label: 'Customer communication' },
            ]
          : [
              { value: 'slow_approvals', label: 'Slow approvals' },
              { value: 'corp_manual', label: 'Manual processes' },
              { value: 'reporting_delays', label: 'Reporting delays' },
              { value: 'siloed_data', label: 'Siloed data / no integration' },
              { value: 'staff_productivity', label: 'Staff productivity' },
              { value: 'comms_breakdown', label: 'Communication breakdown' },
              { value: 'compliance_tasks', label: 'Compliance tasks' },
            ],
    },
    {
      key: 'time_wasters',
      title: 'What wastes the most time in your day? (Select all that apply)',
      type: 'multi',
      options: [
        { value: 'whatsapp_admin', label: 'WhatsApp admin' },
        { value: 'manual_invoicing', label: 'Manual invoicing / quoting' },
        { value: 'writing_reports', label: 'Writing reports' },
        { value: 'spreadsheets', label: 'Updating spreadsheets' },
        { value: 'searching_info', label: 'Searching for information' },
        { value: 'approvals', label: 'Approvals / sign-offs' },
        { value: 'data_entry', label: 'Data entry' },
        { value: 'scheduling', label: 'Scheduling / coordination' },
      ],
    },
    {
      key: 'workflow_frustration',
      title: 'What frustrates you most about your current workflow?',
      type: 'single',
      options: [
        { value: 'manual_work', label: 'Too much manual work' },
        { value: 'repeat_tasks', label: 'Doing the same tasks repeatedly' },
        { value: 'no_tracking', label: 'No single place to track things' },
        { value: 'disconnected_tools', label: 'Tools are not connected' },
        { value: 'slow_comms', label: 'Slow communication' },
        { value: 'unclear_workflow', label: 'Lack of clarity' },
      ],
    },
    {
      key: 'digital_level',
      title: 'How digital is your operation right now?',
      type: 'single',
      options: [
        { value: 'not_digital', label: 'Not digital at all' },
        { value: 'basic', label: 'Basic (WhatsApp, email)' },
        { value: 'semi', label: 'Semi-digital (some tools)' },
        { value: 'full', label: 'Fully digital' },
      ],
    },
    {
      key: 'current_tools',
      title: 'What tools do you currently use? (Select all that apply)',
      type: 'multi',
      options: [
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'spreadsheets', label: 'Spreadsheets' },
        { value: 'crm', label: 'CRM system' },
        { value: 'accounting', label: 'Accounting software' },
        { value: 'project_mgmt', label: 'Project management tool' },
        { value: 'email_marketing', label: 'Email marketing' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      key: 'digital_goal',
      title: 'What would you most like to have digitally?',
      type: 'single',
      options: [
        { value: 'website', label: 'A website' },
        { value: 'automation', label: 'Automation' },
        { value: 'dashboard', label: 'Dashboard / workflow system' },
        { value: 'ai_assistant', label: 'AI assistant' },
        { value: 'crm_goal', label: 'CRM' },
        { value: 'booking', label: 'Booking tool' },
        { value: 'payments', label: 'Payment system' },
        { value: 'internal_platform', label: 'Internal platform' },
      ],
    },
    {
      key: 'wants_automation',
      title: 'Are you interested in automation?',
      type: 'single',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      key: 'automation_targets',
      title: 'What would you most like to automate? (Select all that apply)',
      type: 'multi',
      options: [
        { value: 'customer_replies', label: 'Customer replies' },
        { value: 'reporting', label: 'Reporting' },
        { value: 'invoicing', label: 'Invoicing' },
        { value: 'reminders', label: 'Reminders' },
        { value: 'approvals', label: 'Approvals' },
        { value: 'social', label: 'Social media posting' },
        { value: 'staff_comms', label: 'Staff communication' },
      ],
      skip: surveyData.wants_automation === 'no',
    },
    {
      key: 'ai_openness',
      title: 'How do you feel about AI?',
      type: 'single',
      options: [
        { value: 'excited', label: 'Excited' },
        { value: 'curious', label: 'Curious' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'nervous', label: 'Nervous / Not sure' },
      ],
    },
    {
      key: 'solution_guess',
      title: 'If you could have one solution right now, what would it be?',
      type: 'single',
      options: [
        { value: 'website_sol', label: 'Website' },
        { value: 'automation_sol', label: 'Automation' },
        { value: 'dashboard_sol', label: 'Dashboard' },
        { value: 'ai_sol', label: 'AI assistant' },
        { value: 'crm_sol', label: 'CRM' },
        { value: 'booking_sol', label: 'Booking system' },
        { value: 'payment_sol', label: 'Payment system' },
        { value: 'internal_sol', label: 'Internal platform' },
      ],
    },
    {
      key: 'urgent_feature',
      title: 'What feature would have the biggest impact on your work right now?',
      type: 'single',
      options: [
        { value: 'tracking', label: 'Track tasks & operations' },
        { value: 'automate_messages', label: 'Automate messages' },
        { value: 'centralise_comms', label: 'Centralize communication' },
        { value: 'faster_reporting', label: 'Faster reporting' },
        { value: 'get_customers', label: 'Get more customers' },
        { value: 'manage_staff', label: 'Manage staff' },
      ],
    },
    {
      key: 'budget',
      title: 'What is your monthly budget for digital solutions?',
      type: 'single',
      options: [
        { value: 'under_500', label: 'Under R500' },
        { value: '500_1500', label: 'R500 – R1,500' },
        { value: '1500_3000', label: 'R1,500 – R3,000' },
        { value: '3000_7000', label: 'R3,000 – R7,000' },
        { value: '7000_plus', label: 'R7,000+' },
      ],
    },
    {
      key: 'urgency',
      title: 'When do you need this solution?',
      type: 'single',
      options: [
        { value: 'asap', label: 'ASAP' },
        { value: 'this_month', label: 'This month' },
        { value: 'this_quarter', label: 'This quarter' },
        { value: 'this_year', label: 'This year' },
      ],
    },
    {
      key: 'consent',
      title: 'May we contact you with personalized recommendations?',
      type: 'consent',
      options: [
        { value: 'yes', label: 'Yes, please contact me' },
        { value: 'no', label: 'No, keep my responses anonymous' },
      ],
    },
  ].filter((q) => !q.skip);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center"
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Thank You!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your responses have been recorded. We've learned a lot about how we can help you.
          </p>

          {liveInsights.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What We Learned About You
                </h2>
              </div>
              <div className="space-y-2">
                {liveInsights.slice(-5).map((insight, idx) => (
                  <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    • {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const currentAnswer = surveyData[currentQuestion.key as keyof SurveyData];
  const isAnswered = currentAnswer !== undefined && (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gray-200 dark:bg-gray-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-green-500"
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-8">
            <div className="mb-8">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Question {currentStep + 1} of {questions.length}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                {currentQuestion.title}
              </h2>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {currentQuestion.type === 'consent' ? (
                  <div className="space-y-4">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          handleAnswer(currentQuestion.key, option.value === 'yes');
                        }}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          (option.value === 'yes' && surveyData.consent === true) ||
                          (option.value === 'no' && surveyData.consent === false)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white font-medium">
                          {option.label}
                        </span>
                      </button>
                    ))}

                    {surveyData.consent === true && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-4"
                      >
                        <input
                          type="text"
                          placeholder="Your name"
                          value={surveyData.name || ''}
                          onChange={(e) => handleAnswer('name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="email"
                          placeholder="Your email"
                          value={surveyData.email || ''}
                          onChange={(e) => handleAnswer('email', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="tel"
                          placeholder="Your phone (optional)"
                          value={surveyData.phone || ''}
                          onChange={(e) => handleAnswer('phone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </motion.div>
                    )}
                  </div>
                ) : currentQuestion.type === 'multi' ? (
                  currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleMultiSelect(currentQuestion.key, option.value)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        (currentAnswer as string[])?.includes(option.value)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            (currentAnswer as string[])?.includes(option.value)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {(currentAnswer as string[])?.includes(option.value) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(currentQuestion.key, option.value)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        currentAnswer === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-gray-900 dark:text-white font-medium">
                        {option.label}
                      </span>
                    </button>
                  ))
                )}
              </motion.div>
            </AnimatePresence>

            {liveInsights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Latest Insight
                  </h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {liveInsights[liveInsights.length - 1]}
                </p>
              </motion.div>
            )}

            {liveTags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <TagIcon className="w-4 h-4 text-gray-400 mt-1" />
                {liveTags.slice(-5).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!isAnswered || loading}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  'Saving...'
                ) : currentStep === questions.length - 1 ? (
                  'Complete'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
