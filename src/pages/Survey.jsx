import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Star, Check, Loader2, Globe } from 'lucide-react';

export default function Survey() {
  const { token } = useParams();
  const { t, tf, lang, setLang } = useLanguage();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    base44.entities.SatisfactionSurvey.filter({ public_token: token })
      .then(surveys => {
        if (surveys.length > 0) {
          setSurvey(surveys[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const setAnswer = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const ratingQuestions = survey.questions.filter(q => q.type === 'rating');
      const firstRatingId = ratingQuestions[0]?.id;
      const overallRating = firstRatingId ? answers[firstRatingId] : null;

      const responseEntries = survey.questions.map(q => ({
        question_id: q.id,
        question_text: q.text,
        answer: answers[q.id] || null
      }));

      await base44.entities.SurveyResponse.create({
        survey_id: survey.id,
        training_request_id: survey.training_request_id,
        respondent_name: respondentName || '',
        responses: responseEntries,
        language: lang,
        rating_overall: overallRating || null,
        submitted_at: new Date().toISOString()
      });

      setSubmitted(true);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">{t('common.noResults')}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('survey.thankYou')}</h1>
          <p className="text-sm text-slate-500">{t('survey.thankYouDesc')}</p>
        </div>
      </div>
    );
  }

  const allAnswered = survey.questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('survey.title')}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t('survey.subtitle')}</p>
            {survey.request_id_display && (
              <p className="text-xs text-slate-400 mt-1">ID: {survey.request_id_display}</p>
            )}
          </div>
          <LanguageSelector />
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          {/* Respondent name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('survey.yourName')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
            </label>
            <input value={respondentName} onChange={e => setRespondentName(e.target.value)} className="input-base" placeholder={t('survey.yourNamePlaceholder')} />
          </div>

          {/* Questions */}
          {survey.questions.map((q, idx) => (
            <div key={q.id} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
              <label className="block text-sm font-medium text-slate-800 mb-2">
                {idx + 1}. {tf(q.text)}
              </label>
              {q.type === 'rating' ? (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setAnswer(q.id, n)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star className={`w-7 h-7 ${answers[q.id] >= n ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  rows={3}
                  className="input-base resize-none"
                  placeholder="..."
                />
              )}
            </div>
          ))}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('survey.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}